import { Injectable } from "@nestjs/common"
import { type EntityManager, type FindOptionsWhere, In, MoreThan } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { hcmDayOf } from "@modules/platform/primitives"
import { toContractView } from "./crm.mapper"
import { InjectCrmPriceTable } from "./crm.decorators"
import type { ContractView } from "./customer.contracts"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    ContractEntity,
    CustomerEntity,
    ProjectEntity,
    PurchaseEntity,
    PurchaseFollowupEntity,
    ReceivableEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"
import { paymentCodeOf } from "./price.policy"
import { contractRowOf, crmProvenance, projectRowOf, receivableRowOf, serviceRowOf } from "./purchase-records.mapper"
import type {
    AcceptInput,
    AcceptView,
    ContractListInput,
    CustomerCreateInput,
    CustomerCreatedView,
    FollowUpInput,
    PurchaseCreateInput,
    PurchaseKey,
    PurchaseOpenListInput,
    PurchaseOutcomeInput,
    PurchasePaymentInput,
    PurchaseQuoteInput,
    PurchaseSummaryView,
    PurchaseUpdateInput,
    PurchaseView,
} from "./purchase.contracts"
import {
    type OpenedRecords,
    EDITABLE_PURCHASE_STATES,
    OPEN_PURCHASE_STATES,
    assertState,
    firstInstalmentOf,
    openedRecordsOf,
    purchaseEditsOf,
    purchaseSummaryOf,
    purchaseViewOf,
    quoteOf,
} from "./purchase.policy"
import type { PriceListInput, PriceRowView } from "./renewal.contracts"

/** The keyset names of the lists of this service. */
const LISTS = { prices: "price.list", open: "purchase.open.list", contracts: "contract.list" } as const

/** What a new purchase does not have yet: no customer, quote, payment, acceptance or outcome. */
const UNQUOTED = {
    customerId: null,
    lines: null,
    netVnd: null,
    vatRatePercent: null,
    vatVnd: null,
    totalVnd: null,
    priceSource: null,
    quotedOn: null,
    validUntil: null,
    paymentCode: null,
    transactionRef: null,
    paidAt: null,
    acceptedAt: null,
    projectCode: null,
    contractNo: null,
    note: null,
    confirmedBy: null,
    confirmedAt: null,
    sourceHash: null,
} as const

/** The most follow-ups of one purchase read with it. */
const FOLLOW_UPS_MAX = 200

@Injectable()
/**
 * NEW sales (AGENTS-GRAPHS §9.7), twin of the renewals: the price table, a purchase from enquiry to delivery, its quotes from the
 * table (no tool takes an amount), its follow-ups, the customer and the records an acceptance opens, the payment proved by a bank
 * row, and a person's outcome; plus the workspace's contract register.
 */
export class PurchasesService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
        @InjectCrmPriceTable() private readonly table: ReadonlyArray<PriceRowView>,
    ) {}

    /** The price table by price code, optionally of one kind (PLACEHOLDER rows until the owner's sheet is loaded). */
    listPrices(input: PriceListInput): Promise<Page<PriceRowView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(LISTS.prices, input.page.cursor, 1)?.[0]
        const rows = this.table.filter(
            (row) => (input.kind === null || row.kind === input.kind) && (after === undefined || row.priceCode > after),
        )
        const page = rows.slice(0, limit + 1)
        return Promise.resolve(pageOf(LISTS.prices, page, limit, (row) => [row.priceCode], page.slice(0, limit)))
    }

    /** Opens a purchase for an enquiry; the open purchase of the same channel and source is answered instead. */
    create(input: PurchaseCreateInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const open = await manager.findOne(PurchaseEntity, {
                where: {
                    workspaceId: input.workspaceId,
                    channel: input.channel,
                    sourceRef: input.sourceRef,
                    state: In([...OPEN_PURCHASE_STATES]),
                },
            })
            if (open !== null) return this.viewOf(manager, open)
            const id = this.ids.next()
            const purchase = manager.create(PurchaseEntity, {
                id,
                workspaceId: input.workspaceId,
                code: paymentCodeOf(id, "MUA-"),
                state: "enquiry",
                channel: input.channel,
                sourceRef: input.sourceRef,
                need: input.need,
                contactName: input.contactName,
                phone: input.phone,
                email: input.email,
                domain: input.domain,
                customerCode: input.customerCode,
                ...UNQUOTED,
            })
            await manager.insert(PurchaseEntity, purchase)
            return purchaseViewOf(purchase, [])
        })
    }

    /** Changes the need or the contact as said, or moves an enquiry or a quoted purchase to `lost` with a note. */
    update(input: PurchaseUpdateInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            assertState(purchase, EDITABLE_PURCHASE_STATES)
            const changes = purchaseEditsOf(input)
            await manager.update(PurchaseEntity, { id: purchase.id, workspaceId: input.workspaceId }, changes)
            return this.viewOf(manager, { ...purchase, ...changes })
        })
    }

    /** One purchase with its quote and follow-ups. */
    async get(key: PurchaseKey): Promise<PurchaseView> {
        return this.viewOf(this.entityManager, await this.purchaseOf(this.entityManager, key))
    }

    /** The open purchases by id, optionally in one state or of one source, with their follow-up facts. */
    async listOpen(input: PurchaseOpenListInput): Promise<Page<PurchaseSummaryView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(LISTS.open, input.page.cursor, 1)?.[0]
        const rows = await this.entityManager.find(PurchaseEntity, {
            where: {
                workspaceId: input.workspaceId,
                state: In(OPEN_PURCHASE_STATES.filter((state) => input.state === null || state === input.state)),
                ...(input.sourceRef === null ? {} : { sourceRef: input.sourceRef }),
                ...(after === undefined ? {} : { id: MoreThan(after) }),
            },
            order: { id: "ASC" },
            take: limit + 1,
        })
        const shown = rows.slice(0, limit)
        const followUps = await this.entityManager.find(PurchaseFollowupEntity, {
            where: { workspaceId: input.workspaceId, purchaseId: In(shown.map((row) => row.id)) },
            take: FOLLOW_UPS_MAX * limit,
        })
        const items = shown.map((row) =>
            purchaseSummaryOf(
                row,
                followUps.filter((followUp) => followUp.purchaseId === row.id),
            ),
        )
        return pageOf(LISTS.open, rows, limit, (row) => [row.id], items)
    }

    /** Quotes the asked items from the price table (no amount is taken); the purchase moves to `quoted`. */
    quote(input: PurchaseQuoteInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            assertState(purchase, EDITABLE_PURCHASE_STATES)
            const quote = quoteOf(this.table, input.items, hcmDayOf(this.clock.now()))
            const changes: Partial<PurchaseEntity> = { ...quote, state: "quoted" }
            await manager.update(PurchaseEntity, { id: purchase.id, workspaceId: input.workspaceId }, changes)
            return this.viewOf(manager, { ...purchase, ...changes })
        })
    }

    /** Records today's follow-up of an open purchase; a second one the same day replaces it (key `<id>:<day>`). */
    followUp(input: FollowUpInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            assertState(purchase, OPEN_PURCHASE_STATES)
            const day = hcmDayOf(this.clock.now())
            await manager.upsert(
                PurchaseFollowupEntity,
                {
                    id: this.ids.next(),
                    workspaceId: input.workspaceId,
                    purchaseId: purchase.id,
                    day,
                    channel: input.channel,
                    outcome: input.outcome,
                    messageRef: input.messageRef,
                },
                ["workspaceId", "purchaseId", "day"],
            )
            return this.viewOf(manager, purchase)
        })
    }

    /** Opens a customer of the books for an open purchase; a customer with the same tax id, phone or mail is refused with its code. */
    createCustomer(input: CustomerCreateInput): Promise<CustomerCreatedView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, { workspaceId: input.workspaceId, id: input.purchaseId })
            assertState(purchase, OPEN_PURCHASE_STATES)
            const same: Array<FindOptionsWhere<CustomerEntity>> = [
                ...(input.taxId === null ? [] : [{ workspaceId: input.workspaceId, taxId: input.taxId }]),
                ...(input.phone === null ? [] : [{ workspaceId: input.workspaceId, phone: input.phone }]),
                ...(input.email === null ? [] : [{ workspaceId: input.workspaceId, email: input.email }]),
            ]
            const existing = same.length === 0 ? null : await manager.findOne(CustomerEntity, { where: same })
            if (existing !== null) {
                throw new CrmError({ code: CrmErrorCode.CustomerExists, params: { customerCode: existing.code } })
            }
            const id = this.ids.next()
            const customerCode = paymentCodeOf(id, "KH-")
            await manager.insert(CustomerEntity, {
                id,
                workspaceId: input.workspaceId,
                code: customerCode,
                kind: input.kind,
                name: input.name,
                taxId: input.taxId,
                address: input.address,
                phone: input.phone,
                email: input.email,
                folderPath: null,
                reachable: input.phone !== null || input.email !== null,
                ...crmProvenance(customerCode),
            })
            await manager.update(PurchaseEntity, { id: purchase.id, workspaceId: input.workspaceId }, { customerCode })
            return { customerCode }
        })
    }

    /** Records the customer's acceptance of the current quote: opens the records of the sale (dry: shows them, writes nothing). */
    accept(input: AcceptInput): Promise<AcceptView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            assertState(purchase, ["quoted"])
            if (purchase.validUntil !== null && purchase.validUntil < hcmDayOf(this.clock.now())) {
                throw new CrmError({ code: CrmErrorCode.QuoteExpired, params: { validUntil: purchase.validUntil } })
            }
            const customer = await manager.findOne(CustomerEntity, {
                where: { workspaceId: input.workspaceId, code: input.customerCode },
            })
            if (customer === null) throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
            const opened = openedRecordsOf(purchase, this.table)
            const accepted: PurchaseEntity = {
                ...purchase,
                state: "awaiting_payment",
                customerCode: customer.code,
                customerId: customer.id,
                paymentCode: opened.paymentCode,
                acceptedAt: this.clock.now(),
                projectCode: opened.projectCode,
                contractNo: opened.contractNo,
            }
            if (!input.dryRun) await this.writeAccepted(manager, accepted, customer.id, opened)
            return {
                dryRun: input.dryRun,
                purchase: await this.viewOf(manager, input.dryRun ? purchase : accepted),
                projectCode: opened.projectCode,
                contractNo: opened.contractNo,
                serviceCodes: opened.serviceClasses.map(([code]) => code),
                paymentCode: opened.paymentCode,
                firstInstalmentVnd: firstInstalmentOf(this.table, accepted),
            }
        })
    }

    /** Marks an accepted purchase paid by the bank row (no amount); the same row on another request is refused, a repeat answers. */
    recordPayment(input: PurchasePaymentInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            if (purchase.state === "paid" && purchase.transactionRef === input.transactionRef) {
                return this.viewOf(manager, purchase)
            }
            assertState(purchase, ["awaiting_payment"])
            const usedBy = await Promise.all([
                manager.exists(PurchaseEntity, {
                    where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
                }),
                manager.exists(RenewalRequestEntity, {
                    where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
                }),
            ])
            if (usedBy.some(Boolean)) {
                throw new CrmError({
                    code: CrmErrorCode.TransactionRefUsed,
                    params: { transactionRef: input.transactionRef },
                })
            }
            const changes: Partial<PurchaseEntity> = {
                state: "paid",
                transactionRef: input.transactionRef,
                paidAt: this.clock.now(),
            }
            await manager.update(PurchaseEntity, { id: purchase.id, workspaceId: input.workspaceId }, changes)
            return this.viewOf(manager, { ...purchase, ...changes })
        })
    }

    /** A person's outcome: `delivered` once paid, or `cancelled` while open. */
    recordOutcome(input: PurchaseOutcomeInput): Promise<PurchaseView> {
        return this.entityManager.transaction(async (manager) => {
            const purchase = await this.purchaseOf(manager, input)
            assertState(purchase, input.outcome === "delivered" ? ["paid", "pending_person"] : OPEN_PURCHASE_STATES)
            const changes: Partial<PurchaseEntity> = {
                state: input.outcome,
                note: input.note,
                confirmedBy: input.confirmedBy,
                confirmedAt: this.clock.now(),
            }
            await manager.update(PurchaseEntity, { id: purchase.id, workspaceId: input.workspaceId }, changes)
            return this.viewOf(manager, { ...purchase, ...changes })
        })
    }

    /** The workspace's contracts by number, optionally of one kind or one customer code. */
    async listContracts(input: ContractListInput): Promise<Page<ContractView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(LISTS.contracts, input.page.cursor, 1)?.[0]
        const customer =
            input.customerCode === null
                ? null
                : await this.entityManager.findOne(CustomerEntity, {
                      where: { workspaceId: input.workspaceId, code: input.customerCode },
                  })
        if (input.customerCode !== null && customer === null)
            throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
        const rows = await this.entityManager.find(ContractEntity, {
            where: {
                workspaceId: input.workspaceId,
                ...(input.kind === null ? {} : { kind: input.kind }),
                ...(customer === null ? {} : { customerId: customer.id }),
                ...(after === undefined ? {} : { contractNo: MoreThan(after) }),
            },
            order: { contractNo: "ASC" },
            take: limit + 1,
        })
        const items = rows.slice(0, limit).map((row) => toContractView(row))
        return pageOf(LISTS.contracts, rows, limit, (row) => [row.contractNo], items)
    }

    /** The purchase of a key, or CRM_PURCHASE_NOT_FOUND. */
    private async purchaseOf(manager: EntityManager, key: PurchaseKey): Promise<PurchaseEntity> {
        const purchase = await manager.findOne(PurchaseEntity, { where: { workspaceId: key.workspaceId, id: key.id } })
        if (purchase === null) throw new CrmError({ code: CrmErrorCode.PurchaseNotFound })
        return purchase
    }

    /** The view of a purchase with its follow-ups. */
    private async viewOf(manager: EntityManager, purchase: PurchaseEntity): Promise<PurchaseView> {
        const followUps = await manager.find(PurchaseFollowupEntity, {
            where: { workspaceId: purchase.workspaceId, purchaseId: purchase.id },
            take: FOLLOW_UPS_MAX,
        })
        return purchaseViewOf(purchase, followUps)
    }

    /** Writes the records of an acceptance and the accepted purchase. */
    private async writeAccepted(
        manager: EntityManager,
        purchase: PurchaseEntity,
        customerId: string,
        opened: OpenedRecords,
    ): Promise<void> {
        const workspaceId = purchase.workspaceId
        if (opened.projectCode !== null) {
            await manager.insert(ProjectEntity, projectRowOf(purchase, customerId, opened.projectCode))
        }
        if (opened.serviceClasses.length > 0) {
            await manager.insert(
                ServiceEntity,
                opened.serviceClasses.map(([code, serviceClass]) =>
                    serviceRowOf(workspaceId, customerId, code, serviceClass),
                ),
            )
        }
        await manager.insert(ContractEntity, contractRowOf(purchase, customerId, opened.contractNo))
        await manager.insert(
            ReceivableEntity,
            receivableRowOf(purchase, customerId, opened.receivableProject, opened.contractNo),
        )
        await manager.update(
            PurchaseEntity,
            { id: purchase.id, workspaceId },
            {
                state: purchase.state,
                customerCode: purchase.customerCode,
                customerId,
                paymentCode: purchase.paymentCode,
                acceptedAt: purchase.acceptedAt,
                projectCode: purchase.projectCode,
                contractNo: purchase.contractNo,
            },
        )
    }
}

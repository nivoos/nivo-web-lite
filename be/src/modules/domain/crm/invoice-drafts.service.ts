import { Injectable } from "@nestjs/common"
import { type EntityManager, type FindOptionsWhere, LessThanOrEqual, MoreThan, MoreThanOrEqual, And } from "typeorm"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectMessageCatalog, type MessageCatalog } from "@modules/platform/i18n"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { toInvoiceView } from "./crm.mapper"
import type { InvoiceListInput, WorkspaceInvoiceView } from "./customer.contracts"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    CustomerEntity,
    InvoiceDraftEntity,
    InvoiceEntity,
    PurchaseEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"
import { PLACEHOLDER_VAT_PERCENT } from "./price.policy"
import type {
    InvoiceDraftCreateInput,
    InvoiceDraftKey,
    InvoiceDraftView,
    InvoiceIssuedInput,
} from "./renewal.contracts"

/** The states of a renewal an invoice can be drafted for: the customer has paid. */
const INVOICEABLE: ReadonlySet<string> = new Set(["paid", "pending_person", "renewed"])

/** The states of a purchase an invoice can be drafted for: the customer has paid. */
const INVOICEABLE_PURCHASES: ReadonlySet<string> = new Set(["paid", "pending_person", "delivered"])

/** The keyset name of the workspace-wide invoice list. */
const INVOICE_LIST = "invoice.list"

@Injectable()
/**
 * Invoice drafts: lines and amounts computed by the CRM from a paid renewal or purchase, and the e-invoice issued for one RECORDED on
 * it (data only: the Accounting agent issues the invoice at MISA meInvoice and records it here; owner ruling R57).
 */
export class InvoiceDraftsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectIds() private readonly ids: Ids,
        @InjectMessageCatalog() private readonly catalog: MessageCatalog,
    ) {}

    /** The VAT invoices of the workspace by invoice number, optionally of one customer code and an issue period. */
    async listInvoices(input: InvoiceListInput): Promise<Page<WorkspaceInvoiceView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(INVOICE_LIST, input.page.cursor, 1)?.[0]
        const issued = [
            ...(input.issuedFrom === null ? [] : [MoreThanOrEqual(input.issuedFrom)]),
            ...(input.issuedTo === null ? [] : [LessThanOrEqual(input.issuedTo)]),
        ]
        const where: FindOptionsWhere<InvoiceEntity> = {
            workspaceId: input.workspaceId,
            ...(input.customerCode === null ? {} : { customerCode: input.customerCode }),
            ...(issued.length === 0 ? {} : { issuedOn: And(...issued) }),
            ...(after === undefined ? {} : { invoiceNo: MoreThan(after) }),
        }
        const rows = await this.entityManager.find(InvoiceEntity, {
            where,
            order: { invoiceNo: "ASC" },
            take: limit + 1,
        })
        const items = rows.slice(0, limit).map((row) => ({ ...toInvoiceView(row), customerCode: row.customerCode }))
        return pageOf(INVOICE_LIST, rows, limit, (row) => [row.invoiceNo], items)
    }

    /** Drafts the invoice of a paid renewal; one draft per renewal, so a repeat answers the same draft. */
    create(input: InvoiceDraftCreateInput): Promise<InvoiceDraftView> {
        const { workspaceId, renewalId, purchaseId } = input
        if (renewalId !== null && purchaseId === null) {
            return this.drafted({ workspaceId, renewalId }, (manager) =>
                this.renewalDraftOf(manager, workspaceId, renewalId),
            )
        }
        if (purchaseId !== null && renewalId === null) {
            return this.drafted({ workspaceId, purchaseId }, (manager) =>
                this.purchaseDraftOf(manager, workspaceId, purchaseId),
            )
        }
        return Promise.reject(new CrmError({ code: CrmErrorCode.InvoiceDraftSubjectInvalid }))
    }

    /** The stored draft of a subject, else the one `draftOf` makes, inserted; one transaction. */
    private drafted(
        subject: FindOptionsWhere<InvoiceDraftEntity>,
        draftOf: (manager: EntityManager) => Promise<InvoiceDraftEntity>,
    ): Promise<InvoiceDraftView> {
        return this.entityManager.transaction(async (manager) => {
            const stored = await manager.findOne(InvoiceDraftEntity, { where: subject })
            if (stored !== null) return this.viewOf(manager, stored)
            const row = await draftOf(manager)
            await manager.insert(InvoiceDraftEntity, row)
            return this.viewOf(manager, row)
        })
    }

    /** One draft. */
    async get(key: InvoiceDraftKey): Promise<InvoiceDraftView> {
        const draft = await this.entityManager.findOne(InvoiceDraftEntity, {
            where: { workspaceId: key.workspaceId, id: key.id },
        })
        if (draft === null) throw new CrmError({ code: CrmErrorCode.InvoiceDraftNotFound })
        return this.viewOf(this.entityManager, draft)
    }

    /**
     * Records the e-invoice issued for a draft (its number, the provider's reference, the issue date): the draft becomes `issued`.
     * The same number again answers the stored draft; another number on an issued draft, or a number another draft holds, is refused.
     */
    recordIssued(input: InvoiceIssuedInput): Promise<InvoiceDraftView> {
        return this.entityManager.transaction(async (manager) => {
            const draft = await manager.findOne(InvoiceDraftEntity, {
                where: { workspaceId: input.workspaceId, id: input.id },
                lock: { mode: "pessimistic_write" },
            })
            if (draft === null) throw new CrmError({ code: CrmErrorCode.InvoiceDraftNotFound })
            if (draft.invoiceNo === input.invoiceNo) return this.viewOf(manager, draft)
            if (draft.invoiceNo !== null) {
                throw new CrmError({ code: CrmErrorCode.InvoiceAlreadyIssued, params: { invoiceNo: draft.invoiceNo } })
            }
            const used = await manager.exists(InvoiceDraftEntity, {
                where: { workspaceId: input.workspaceId, invoiceNo: input.invoiceNo },
            })
            if (used) throw new CrmError({ code: CrmErrorCode.InvoiceNumberUsed })
            const changes = {
                state: "issued" as const,
                invoiceNo: input.invoiceNo,
                providerRef: input.providerRef,
                issuedOn: input.issuedOn,
            }
            await manager.update(InvoiceDraftEntity, { id: draft.id, workspaceId: input.workspaceId }, changes)
            return this.viewOf(manager, { ...draft, ...changes })
        })
    }

    /** The draft of a paid renewal: one line, the renewal's own amounts. */
    private async renewalDraftOf(
        manager: EntityManager,
        workspaceId: string,
        renewalId: string,
    ): Promise<InvoiceDraftEntity> {
        const renewal = await manager.findOne(RenewalRequestEntity, { where: { workspaceId, id: renewalId } })
        if (renewal === null) throw new CrmError({ code: CrmErrorCode.RenewalNotFound })
        if (
            !INVOICEABLE.has(renewal.state) ||
            renewal.netVnd === null ||
            renewal.vatVnd === null ||
            renewal.totalVnd === null
        ) {
            throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state: renewal.state } })
        }
        const service = await manager.findOne(ServiceEntity, { where: { workspaceId, id: renewal.serviceId } })
        if (service === null) throw new CrmError({ code: CrmErrorCode.ServiceNotFound })
        return manager.create(InvoiceDraftEntity, {
            id: this.ids.next(),
            workspaceId,
            renewalId: renewal.id,
            purchaseId: null,
            customerId: service.customerId,
            lines: [
                {
                    description: this.lineOf(service.serviceClass, service.code, renewal.termMonths),
                    quantity: 1,
                    unitPriceVnd: renewal.netVnd,
                    amountVnd: renewal.netVnd,
                },
            ],
            netVnd: renewal.netVnd,
            vatRatePercent: PLACEHOLDER_VAT_PERCENT,
            vatVnd: renewal.vatVnd,
            totalVnd: renewal.totalVnd,
            state: "draft",
            priceSource: renewal.priceSource,
            invoiceNo: null,
            providerRef: null,
            issuedOn: null,
        })
    }

    /** The draft of a paid purchase: the lines and amounts of its accepted quote. */
    private async purchaseDraftOf(
        manager: EntityManager,
        workspaceId: string,
        purchaseId: string,
    ): Promise<InvoiceDraftEntity> {
        const purchase = await manager.findOne(PurchaseEntity, { where: { workspaceId, id: purchaseId } })
        if (purchase === null) throw new CrmError({ code: CrmErrorCode.PurchaseNotFound })
        const { lines, netVnd, vatVnd, totalVnd, customerId } = purchase
        if (
            !INVOICEABLE_PURCHASES.has(purchase.state) ||
            customerId === null ||
            lines === null ||
            netVnd === null ||
            vatVnd === null ||
            totalVnd === null
        ) {
            throw new CrmError({ code: CrmErrorCode.PurchaseStateRefused, params: { state: purchase.state } })
        }
        return manager.create(InvoiceDraftEntity, {
            id: this.ids.next(),
            workspaceId,
            renewalId: null,
            purchaseId: purchase.id,
            customerId,
            lines: lines.map((line) => ({
                description: line.name,
                quantity: line.quantity,
                unitPriceVnd: line.unitPriceVnd,
                amountVnd: line.amountVnd,
            })),
            netVnd,
            vatRatePercent: purchase.vatRatePercent ?? PLACEHOLDER_VAT_PERCENT,
            vatVnd,
            totalVnd,
            state: "draft",
            priceSource: purchase.priceSource ?? "placeholder",
            invoiceNo: null,
            providerRef: null,
            issuedOn: null,
        })
    }

    private lineOf(serviceClass: string, serviceCode: string, termMonths: number): string {
        const label = this.catalog.get(`crm.service-class.${serviceClass}`, {}, "vi")
        return this.catalog.get(
            "crm.invoice-draft.renewal-line",
            { serviceClass: label, serviceCode, termMonths },
            "vi",
        )
    }

    private async viewOf(manager: EntityManager, draft: InvoiceDraftEntity): Promise<InvoiceDraftView> {
        const customer = await manager.findOne(CustomerEntity, {
            where: { workspaceId: draft.workspaceId, id: draft.customerId },
        })
        return {
            id: draft.id,
            renewalId: draft.renewalId,
            purchaseId: draft.purchaseId,
            customerCode: customer?.code ?? "",
            lines: draft.lines,
            netVnd: draft.netVnd,
            vatRatePercent: draft.vatRatePercent,
            vatVnd: draft.vatVnd,
            totalVnd: draft.totalVnd,
            state: draft.state,
            priceSource: draft.priceSource,
            invoiceNo: draft.invoiceNo,
            providerRef: draft.providerRef,
            issuedOn: draft.issuedOn,
        }
    }
}

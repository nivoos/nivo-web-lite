import { Injectable } from "@nestjs/common"
import { type EntityManager, In, MoreThan } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { hcmDayOf } from "@modules/platform/primitives"
import {
    InjectRenewalProvider,
    type ProviderRenewResult,
    type RenewalProviderService,
} from "@modules/integrations/renewal-provider"
import { toRenewalView } from "./crm.mapper"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    CustomerEntity,
    ProviderAccountEntity,
    ReceivablePaymentEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"
import { paymentCodeOf, priceOf } from "./price.policy"
import {
    NOT_RENEWABLE_STATUSES,
    OPEN_RENEWAL_STATES,
    assertConfirmable,
    assertExecutable,
    assertPayable,
} from "./renewal-state.policy"
import { isReplay, requestHashOf } from "./request-key.policy"
import type {
    QuoteInput,
    RenewalExecuteInput,
    RenewalKey,
    RenewalOpenListInput,
    RenewalOutcomeInput,
    RenewalPaymentInput,
    RenewalView,
} from "./renewal.contracts"

/** The keyset names of the renewal lists. */
const LISTS = { prices: "price.list", open: "renewal.open.list" } as const

/** A row lock for a state change. */
const FOR_UPDATE = { mode: "pessimistic_write" } as const

@Injectable()
/**
 * Renewals, pay first (owner, 2026-11-12): a request is opened on the customer's yes with the CRM's own total and transfer code
 * (`awaiting_payment`), marked `paid` by the bank row that proves it, executed at the provider only when paid (manual: `pending_person`;
 * mock: `renewed`, labelled, nothing called), and closed by a person's confirmation (`renewed` moves the service's end date; `failed`).
 */
export class RenewalsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
        @InjectRenewalProvider() private readonly providers: RenewalProviderService,
    ) {}

    /** Opens a renewal request on the customer's yes: computes the total and the transfer code; a repeat of the key answers the same request. */
    quote(input: QuoteInput): Promise<RenewalView> {
        const hash = requestHashOf({
            operation: "renewal.quote.create",
            serviceCode: input.serviceCode,
            termMonths: input.termMonths,
        })
        return this.entityManager.transaction(async (manager) => {
            const stored = await manager.findOne(RenewalRequestEntity, {
                where: { workspaceId: input.workspaceId, requestKey: input.requestKey },
            })
            if (stored !== null && isReplay(stored, hash)) return this.viewOf(manager, stored)
            const service = await manager.findOne(ServiceEntity, {
                where: { workspaceId: input.workspaceId, code: input.serviceCode },
            })
            if (service === null) throw new CrmError({ code: CrmErrorCode.ServiceNotFound })
            if (NOT_RENEWABLE_STATUSES.includes(service.status)) {
                throw new CrmError({ code: CrmErrorCode.ServiceNotRenewable, params: { status: service.status } })
            }
            const open = await manager.findOne(RenewalRequestEntity, {
                where: { workspaceId: input.workspaceId, serviceId: service.id, state: In([...OPEN_RENEWAL_STATES]) },
            })
            if (open !== null)
                throw new CrmError({ code: CrmErrorCode.RenewalOpenExists, params: { renewalId: open.id } })
            const price = priceOf(service.serviceClass, input.termMonths)
            if (price === null) {
                throw new CrmError({
                    code: CrmErrorCode.PriceUnknown,
                    params: { serviceClass: service.serviceClass, termMonths: input.termMonths },
                })
            }
            const id = this.ids.next()
            const row = manager.create(RenewalRequestEntity, {
                id,
                workspaceId: input.workspaceId,
                serviceId: service.id,
                provider: service.provider ?? "manual",
                termMonths: input.termMonths,
                state: "awaiting_payment",
                dryRun: true,
                requestKey: input.requestKey,
                requestHash: hash,
                netVnd: price.netVnd,
                vatVnd: price.vatVnd,
                totalVnd: price.totalVnd,
                priceSource: price.priceSource,
                paymentCode: paymentCodeOf(id, "GH"),
                transactionRef: null,
                paidAt: null,
                plugin: null,
                executeKey: null,
                executeHash: null,
                executedAt: null,
                providerRef: null,
                newExpiresOn: null,
                outcomeNote: null,
                confirmedBy: null,
                confirmedAt: null,
            })
            await manager.insert(RenewalRequestEntity, row)
            return this.viewOf(manager, { ...row, createdAt: this.clock.now() }, service)
        })
    }

    /** One renewal request. */
    async get(key: RenewalKey): Promise<RenewalView> {
        return this.viewOf(this.entityManager, await this.renewalOf(this.entityManager, key, false))
    }

    /** The open requests (awaiting payment, paid, waiting for a person), optionally of one customer, by id. */
    async listOpen(input: RenewalOpenListInput): Promise<Page<RenewalView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(LISTS.open, input.page.cursor, 1)?.[0]
        let serviceFilter = {}
        if (input.customerCode !== null) {
            const customer = await this.entityManager.findOne(CustomerEntity, {
                where: { workspaceId: input.workspaceId, code: input.customerCode },
            })
            if (customer === null) throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
            const services = await this.entityManager.find(ServiceEntity, {
                where: { workspaceId: input.workspaceId, customerId: customer.id },
                take: 500,
            })
            serviceFilter = { serviceId: In(services.map((service) => service.id)) }
        }
        const rows = await this.entityManager.find(RenewalRequestEntity, {
            where: {
                workspaceId: input.workspaceId,
                state: In(OPEN_RENEWAL_STATES.filter((state) => input.state === null || state === input.state)),
                ...serviceFilter,
                ...(after === undefined ? {} : { id: MoreThan(after) }),
            },
            order: { id: "ASC" },
            take: limit + 1,
        })
        const views = await this.viewsOf(input.workspaceId, rows.slice(0, limit))
        return pageOf(
            LISTS.open,
            rows,
            limit,
            (row) => [row.id],
            rows.slice(0, limit).flatMap((row) => views.get(row.id) ?? []),
        )
    }

    /** Marks an awaiting request paid by the bank row that proves it (no amount is taken); the same row again answers the same request. */
    recordPayment(input: RenewalPaymentInput): Promise<RenewalView> {
        return this.entityManager.transaction(async (manager) => {
            const renewal = await this.renewalOf(manager, input, true)
            if (renewal.transactionRef === input.transactionRef) return this.viewOf(manager, renewal)
            assertPayable(renewal.state)
            const usedByRenewal = await manager.exists(RenewalRequestEntity, {
                where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
            })
            const usedByReceivable = await manager.exists(ReceivablePaymentEntity, {
                where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
            })
            if (usedByRenewal || usedByReceivable) throw new CrmError({ code: CrmErrorCode.TransactionUsed })
            const paidAt = this.clock.now()
            await manager.update(
                RenewalRequestEntity,
                { id: renewal.id, workspaceId: input.workspaceId },
                { state: "paid", transactionRef: input.transactionRef, paidAt },
            )
            return this.viewOf(manager, { ...renewal, state: "paid", transactionRef: input.transactionRef, paidAt })
        })
    }

    /**
     * Asks the provider plugin to renew a PAID request (refused otherwise: CRM_RENEWAL_NOT_PAID). The claim and the result are two
     * transactions around the plugin call, never one across it; a retry with the same key re-asks only while no result is recorded.
     */
    async execute(input: RenewalExecuteInput): Promise<RenewalView> {
        const hash = requestHashOf({
            operation: "service.renewal.create",
            serviceCode: input.serviceCode,
            renewalId: input.renewalId,
            dryRun: input.dryRun,
        })
        const claimed = await this.entityManager.transaction(async (manager) => {
            const renewal = await this.renewalOf(manager, { workspaceId: input.workspaceId, id: input.renewalId }, true)
            const service = await this.serviceById(manager, input.workspaceId, renewal.serviceId)
            if (service.code !== input.serviceCode)
                throw new CrmError({ code: CrmErrorCode.RenewalServiceMismatch, params: { serviceCode: service.code } })
            if (renewal.executeKey === input.requestKey) {
                isReplay({ requestHash: renewal.executeHash }, hash)
                if (renewal.state !== "paid") return { done: true as const, renewal, service }
            } else {
                const other = await manager.findOne(RenewalRequestEntity, {
                    where: { workspaceId: input.workspaceId, executeKey: input.requestKey },
                })
                if (other !== null) throw new CrmError({ code: CrmErrorCode.IdempotencyKeyReused })
                assertExecutable(renewal.state)
                if (renewal.executeKey !== null)
                    throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state: "executing" } })
                const executedAt = this.clock.now()
                await manager.update(
                    RenewalRequestEntity,
                    { id: renewal.id, workspaceId: input.workspaceId },
                    { executeKey: input.requestKey, executeHash: hash, executedAt },
                )
            }
            const live = await manager.exists(ProviderAccountEntity, {
                where: { workspaceId: input.workspaceId, provider: renewal.provider, mode: "live" },
            })
            return { done: false as const, renewal, service, dryRun: input.dryRun || !live }
        })
        if (claimed.done) return this.viewOf(this.entityManager, claimed.renewal, claimed.service)
        const result = await this.askProvider(claimed.renewal, claimed.service, claimed.dryRun)
        return this.entityManager.transaction(async (manager) => {
            const changes = {
                state: result.state,
                plugin: result.plugin,
                providerRef: result.providerRef,
                newExpiresOn: result.newExpiresOn,
                dryRun: result.dryRun,
            }
            await manager.update(
                RenewalRequestEntity,
                { id: claimed.renewal.id, workspaceId: input.workspaceId, state: "paid" },
                changes,
            )
            return this.viewOf(
                manager,
                { ...claimed.renewal, ...changes, executeKey: input.requestKey, executeHash: hash },
                claimed.service,
            )
        })
    }

    /** A person confirms what happened at the provider; `renewed` with a date moves the service's end date (source `confirmed`). */
    recordOutcome(input: RenewalOutcomeInput): Promise<RenewalView> {
        return this.entityManager.transaction(async (manager) => {
            const renewal = await this.renewalOf(manager, input, true)
            if (renewal.state === input.outcome && renewal.confirmedBy !== null) return this.viewOf(manager, renewal)
            assertConfirmable(renewal.state)
            const changes = {
                state: input.outcome,
                confirmedBy: input.confirmedBy,
                confirmedAt: this.clock.now(),
                newExpiresOn: input.newExpiresOn ?? renewal.newExpiresOn,
                outcomeNote: input.note,
            }
            await manager.update(RenewalRequestEntity, { id: renewal.id, workspaceId: input.workspaceId }, changes)
            if (input.outcome === "renewed" && input.newExpiresOn !== null) {
                await manager.update(
                    ServiceEntity,
                    { id: renewal.serviceId, workspaceId: input.workspaceId },
                    { expiresOn: input.newExpiresOn, expirySource: "confirmed", status: "active" },
                )
            }
            return this.viewOf(manager, { ...renewal, ...changes })
        })
    }

    private askProvider(
        renewal: RenewalRequestEntity,
        service: ServiceEntity,
        dryRun: boolean,
    ): Promise<ProviderRenewResult> {
        return this.providers
            .pluginFor(service.provider)
            .renew({
                serviceCode: service.code,
                provider: service.provider,
                expiresOn: service.expiresOn,
                today: hcmDayOf(this.clock.now()),
                renewalId: renewal.id,
                termMonths: renewal.termMonths,
                dryRun,
            })
            .catch((cause: unknown) => {
                throw new CrmError({ code: CrmErrorCode.ProviderUnavailable, cause })
            })
    }

    private async renewalOf(manager: EntityManager, key: RenewalKey, lock: boolean): Promise<RenewalRequestEntity> {
        const renewal = await manager.findOne(RenewalRequestEntity, {
            where: { workspaceId: key.workspaceId, id: key.id },
            ...(lock ? { lock: FOR_UPDATE } : {}),
        })
        if (renewal === null) throw new CrmError({ code: CrmErrorCode.RenewalNotFound })
        return renewal
    }

    private async serviceById(manager: EntityManager, workspaceId: string, id: string): Promise<ServiceEntity> {
        const service = await manager.findOne(ServiceEntity, { where: { workspaceId, id } })
        if (service === null) throw new CrmError({ code: CrmErrorCode.ServiceNotFound })
        return service
    }

    private async viewOf(
        manager: EntityManager,
        renewal: RenewalRequestEntity,
        known?: ServiceEntity,
    ): Promise<RenewalView> {
        const service = known ?? (await this.serviceById(manager, renewal.workspaceId, renewal.serviceId))
        const customer = await manager.findOne(CustomerEntity, {
            where: { workspaceId: renewal.workspaceId, id: service.customerId },
        })
        return toRenewalView(renewal, service.code, customer?.code ?? "")
    }

    private async viewsOf(
        workspaceId: string,
        rows: ReadonlyArray<RenewalRequestEntity>,
    ): Promise<ReadonlyMap<string, RenewalView>> {
        if (rows.length === 0) return new Map<string, never>()
        const serviceIds = [...new Set(rows.map((row) => row.serviceId))]
        const services = await this.entityManager.find(ServiceEntity, {
            where: { workspaceId, id: In(serviceIds) },
            take: serviceIds.length,
        })
        const customerIds = [...new Set(services.map((service) => service.customerId))]
        const customers = await this.entityManager.find(CustomerEntity, {
            where: { workspaceId, id: In(customerIds) },
            take: customerIds.length,
        })
        const serviceOf = new Map(services.map((service) => [service.id, service]))
        const codeOf = new Map(customers.map((customer) => [customer.id, customer.code]))
        return new Map(
            rows.map((row) => {
                const service = serviceOf.get(row.serviceId)
                return [
                    row.id,
                    toRenewalView(
                        row,
                        service?.code ?? "",
                        service === undefined ? "" : (codeOf.get(service.customerId) ?? ""),
                    ),
                ]
            }),
        )
    }
}

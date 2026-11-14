import { Injectable } from "@nestjs/common"
import {
    And,
    Between,
    type EntityManager,
    type FindOperator,
    type FindOptionsWhere,
    In,
    LessThanOrEqual,
    MoreThan,
    Not,
} from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { addDays, daysBetween, hcmDayOf } from "@modules/platform/primitives"
import { isoOf, toServiceView } from "./crm.mapper"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    CustomerEntity,
    RenewalRequestEntity,
    ServiceEntity,
    ServiceReminderEntity,
    WebsiteEntity,
} from "./persistence/entities"
import { factRowsOf, factsById } from "./raw-row.policy"
import { OPEN_RENEWAL_STATES } from "./renewal-state.policy"
import { isReplay, requestHashOf } from "./request-key.policy"
import type {
    ExpiringInput,
    ExpiringServiceView,
    ReminderRecordInput,
    ReminderView,
    ServiceKey,
    ServiceStatusView,
} from "./service.contracts"

/** The renewal list's keyset name. */
const EXPIRING_LIST = "service.expiring.list"

/** Reminder outcomes that still wait for the customer. */
const WAITING_OUTCOMES: ReadonlySet<string> = new Set(["sent", "quoted"])

/** Statuses the renewal list leaves out (a cancelled service is not renewed). */
const NOT_LISTED_STATUSES = ["cancelled"]

/** The state a stored end date implies on a day: unknown without one. */
const stateOn = (expiresOn: string | null, today: string): ServiceStatusView["state"] => {
    if (expiresOn === null) return "unknown"
    return expiresOn >= today ? "active" : "expired"
}

@Injectable()
/** The services book: the renewal list with its reminder facts, a service's state as the books hold it, and reminder records. */
export class ServicesBookService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
    ) {}

    /** Services ending within `withinDays` of `asOf` (and the expired ones when asked), by end date then code, with the facts to decide on. */
    async listExpiring(input: ExpiringInput): Promise<Page<ExpiringServiceView>> {
        const limit = pageSizeOf(input.page.limit)
        const keys = decodeCursor(EXPIRING_LIST, input.page.cursor, 2)
        const asOf = input.asOf ?? hcmDayOf(this.clock.now())
        const to = addDays(asOf, input.withinDays)
        const range: FindOperator<string> = input.includeExpired === "true" ? LessThanOrEqual(to) : Between(asOf, to)
        const base: FindOptionsWhere<ServiceEntity> = {
            workspaceId: input.workspaceId,
            status: Not(In(NOT_LISTED_STATUSES)),
        }
        const where: Array<FindOptionsWhere<ServiceEntity>> =
            keys === null
                ? [{ ...base, expiresOn: range }]
                : [
                      { ...base, expiresOn: And(range, MoreThan(String(keys[0]))) },
                      { ...base, expiresOn: String(keys[0]), code: MoreThan(String(keys[1])) },
                  ]
        const rows = await this.entityManager.find(ServiceEntity, {
            where,
            order: { expiresOn: "ASC", code: "ASC" },
            take: limit + 1,
        })
        const views = await this.expiringViews(input.workspaceId, rows.slice(0, limit), asOf)
        return pageOf(EXPIRING_LIST, rows, limit, (row) => [row.expiresOn ?? "", row.code], views)
    }

    /** The state of a service as the books hold it: its status, its end date and that date's source; no provider is asked. */
    async status(key: ServiceKey): Promise<ServiceStatusView> {
        const service = await this.serviceOf(this.entityManager, key)
        return {
            serviceCode: service.code,
            status: service.status,
            state: stateOn(service.expiresOn, hcmDayOf(this.clock.now())),
            expiresOn: service.expiresOn,
            expirySource: service.expirySource,
        }
    }

    /** Records a reminder sent (or its outcome) about a service; a repeat of the key answers the first record. */
    recordReminder(input: ReminderRecordInput): Promise<ReminderView> {
        const hash = requestHashOf({
            operation: "service.reminder.record",
            serviceCode: input.code,
            channel: input.channel,
            outcome: input.outcome,
            messageRef: input.messageRef,
        })
        return this.entityManager.transaction(async (manager) => {
            const stored = await this.storedReminder(manager, input)
            if (stored !== null && isReplay(stored, hash)) return this.reminderView(stored, input.code)
            const service = await this.serviceOf(manager, input)
            const row = manager.create(ServiceReminderEntity, {
                id: this.ids.next(),
                workspaceId: input.workspaceId,
                serviceId: service.id,
                channel: input.channel,
                outcome: input.outcome,
                messageRef: input.messageRef,
                sentAt: this.clock.now(),
                requestKey: input.requestKey,
                requestHash: hash,
            })
            await manager.insert(ServiceReminderEntity, row)
            return this.reminderView(row, service.code)
        })
    }

    private async expiringViews(
        workspaceId: string,
        rows: ReadonlyArray<ServiceEntity>,
        asOf: string,
    ): Promise<ReadonlyArray<ExpiringServiceView>> {
        if (rows.length === 0) return []
        const serviceIds = rows.map((row) => row.id)
        const customerIds = [...new Set(rows.map((row) => row.customerId))]
        const websiteIds = [...new Set(rows.flatMap((row) => (row.websiteId === null ? [] : [row.websiteId])))]
        const customers = await this.entityManager.find(CustomerEntity, {
            where: { workspaceId, id: In(customerIds) },
            take: customerIds.length,
        })
        const contacts = await this.entityManager.find(ContactEntity, {
            where: { workspaceId, customerId: In(customerIds) },
            take: 1000,
        })
        const sites =
            websiteIds.length === 0
                ? []
                : await this.entityManager.find(WebsiteEntity, {
                      where: { workspaceId, id: In(websiteIds) },
                      take: websiteIds.length,
                  })
        const open = await this.entityManager.find(RenewalRequestEntity, {
            where: { workspaceId, serviceId: In(serviceIds), state: In([...OPEN_RENEWAL_STATES]) },
            order: { createdAt: "DESC" },
            take: serviceIds.length * 3,
        })
        const reminders = factsById(
            factRowsOf(
                await this.entityManager
                    .createQueryBuilder(ServiceReminderEntity, "r")
                    .select("r.service_id", "id")
                    .addSelect("count(*)", "count")
                    .addSelect("max(r.sent_at)", "last")
                    .addSelect("(array_agg(r.outcome ORDER BY r.sent_at DESC))[1]", "latest")
                    .where("r.workspace_id = :workspaceId", { workspaceId })
                    .andWhere("r.service_id IN (:...serviceIds)", { serviceIds })
                    .groupBy("r.service_id")
                    .getRawMany(),
            ),
        )
        const customerOf = new Map(customers.map((customer) => [customer.id, customer]))
        const linked = new Set(contacts.map((contact) => contact.customerId))
        const domainOf = new Map(sites.map((site) => [site.id, site.domain]))
        const openOf = new Map<string, string>()
        for (const renewal of open) if (!openOf.has(renewal.serviceId)) openOf.set(renewal.serviceId, renewal.id)
        return rows.map((row): ExpiringServiceView => {
            const customer = customerOf.get(row.customerId)
            const facts = reminders.get(row.id)
            const view: ExpiringServiceView = {
                ...toServiceView(
                    row,
                    customer?.code ?? "",
                    row.websiteId === null ? null : (domainOf.get(row.websiteId) ?? null),
                ),
                daysLeft: daysBetween(asOf, row.expiresOn ?? asOf),
                reachable: (customer?.reachable ?? false) || linked.has(row.customerId),
                lastReminderOn: facts?.last === null || facts === undefined ? null : hcmDayOf(facts.last),
                reminderCount: facts?.count ?? 0,
                openReminder: facts?.latest !== null && facts !== undefined && WAITING_OUTCOMES.has(facts.latest),
                openRenewalId: openOf.get(row.id) ?? null,
            }
            return view
        })
    }

    /** The reminder already recorded under the request's key, if any. */
    private storedReminder(manager: EntityManager, input: ReminderRecordInput): Promise<ServiceReminderEntity | null> {
        return manager.findOne(ServiceReminderEntity, {
            where: { workspaceId: input.workspaceId, requestKey: input.requestKey },
        })
    }

    private async serviceOf(manager: EntityManager, key: ServiceKey): Promise<ServiceEntity> {
        const service = await manager.findOne(ServiceEntity, {
            where: { workspaceId: key.workspaceId, code: key.code },
        })
        if (service === null) throw new CrmError({ code: CrmErrorCode.ServiceNotFound })
        return service
    }

    private reminderView(row: ServiceReminderEntity, serviceCode: string): ReminderView {
        return {
            id: row.id,
            serviceCode,
            channel: row.channel,
            outcome: row.outcome,
            messageRef: row.messageRef,
            sentAt: isoOf(row.sentAt),
        }
    }
}

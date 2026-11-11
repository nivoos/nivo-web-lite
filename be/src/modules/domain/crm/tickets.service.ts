import { Injectable } from "@nestjs/common"
import { type EntityManager, type FindOptionsWhere, In, LessThan } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { toTicketNoteView, toTicketSummary } from "./crm.mapper"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { CustomerEntity, ServiceEntity, TicketEntity, TicketNoteEntity } from "./persistence/entities"
import { isReplay, requestHashOf } from "./request-key.policy"
import { assertTicketTransition } from "./ticket-status.policy"
import type {
    TicketCreateInput,
    TicketKey,
    TicketListInput,
    TicketSummaryView,
    TicketUpdateInput,
    TicketView,
} from "./ticket.contracts"

/** The ticket list's keyset name. */
const TICKET_LIST = "ticket.list"

@Injectable()
/** Support tickets: opened by the desk flow (keyed by conversation + first message), worked by people through notes and status changes. */
export class TicketsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
    ) {}

    /** Opens a ticket; a repeat of the key answers the same ticket. */
    create(input: TicketCreateInput): Promise<TicketView> {
        const { workspaceId, requestKey, ...request } = input
        const hash = requestHashOf({ operation: "ticket.create", ...request })
        return this.entityManager.transaction(async (manager) => {
            const stored = await manager.findOne(TicketEntity, { where: { workspaceId, requestKey } })
            if (stored !== null && isReplay(stored, hash)) return this.viewOf(manager, stored)
            let customerId: string | null = null
            if (input.customerCode !== null) {
                const customer = await manager.findOne(CustomerEntity, {
                    where: { workspaceId, code: input.customerCode },
                })
                if (customer === null) throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
                customerId = customer.id
            }
            const codes = [...new Set(input.serviceCodes)]
            const services =
                codes.length === 0
                    ? []
                    : await manager.find(ServiceEntity, { where: { workspaceId, code: In(codes) }, take: codes.length })
            const missing = codes.find((code) => !services.some((service) => service.code === code))
            if (missing !== undefined)
                throw new CrmError({ code: CrmErrorCode.TicketServiceUnknown, params: { serviceCode: missing } })
            const row = manager.create(TicketEntity, {
                id: this.ids.next(),
                workspaceId,
                customerId,
                serviceIds: codes.map((code) => services.find((service) => service.code === code)?.id ?? ""),
                kind: input.kind,
                status: "open",
                channel: input.channel,
                sourceRef: input.sourceRef,
                subject: input.subject,
                summary: input.summary,
                openedAt: this.clock.now(),
                closedAt: null,
                requestKey,
                requestHash: hash,
            })
            await manager.insert(TicketEntity, row)
            return { ...toTicketSummary(row, input.customerCode, codes), summary: row.summary, notes: [] }
        })
    }

    /** One ticket with its notes. */
    async get(key: TicketKey): Promise<TicketView> {
        const ticket = await this.entityManager.findOne(TicketEntity, {
            where: { workspaceId: key.workspaceId, id: key.id },
        })
        if (ticket === null) throw new CrmError({ code: CrmErrorCode.TicketNotFound })
        return this.viewOf(this.entityManager, ticket)
    }

    /** Tickets newest first (by id within one instant), optionally of one customer or one status. */
    async list(input: TicketListInput): Promise<Page<TicketSummaryView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(TICKET_LIST, input.page.cursor, 1)?.[0]
        let customerFilter: FindOptionsWhere<TicketEntity> = {}
        if (input.customerCode !== null) {
            const customer = await this.entityManager.findOne(CustomerEntity, {
                where: { workspaceId: input.workspaceId, code: input.customerCode },
            })
            if (customer === null) throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
            customerFilter = { customerId: customer.id }
        }
        const rows = await this.entityManager.find(TicketEntity, {
            where: {
                workspaceId: input.workspaceId,
                ...customerFilter,
                ...(input.status === null ? {} : { status: input.status }),
                ...(after === undefined ? {} : { id: LessThan(after) }),
            },
            order: { id: "DESC" },
            take: limit + 1,
        })
        const kept = rows.slice(0, limit)
        const codes = await this.codesOf(this.entityManager, input.workspaceId, kept)
        return pageOf(
            TICKET_LIST,
            rows,
            limit,
            (row) => [row.id],
            rows.slice(0, limit).map((row) =>
                toTicketSummary(
                    row,
                    row.customerId === null ? null : (codes.customers.get(row.customerId) ?? null),
                    row.serviceIds.map((id) => codes.services.get(id) ?? ""),
                ),
            ),
        )
    }

    /** Adds a note and/or moves the status; a repeat of the key answers the ticket as it is. */
    update(input: TicketUpdateInput): Promise<TicketView> {
        const hash = requestHashOf({
            operation: "ticket.update",
            id: input.id,
            status: input.status,
            note: input.note,
            author: input.author,
        })
        return this.entityManager.transaction(async (manager) => {
            if (input.status === null && input.note === null)
                throw new CrmError({ code: CrmErrorCode.TicketUpdateEmpty })
            const ticket = await manager.findOne(TicketEntity, {
                where: { workspaceId: input.workspaceId, id: input.id },
                lock: { mode: "pessimistic_write" },
            })
            if (ticket === null) throw new CrmError({ code: CrmErrorCode.TicketNotFound })
            const stored = await manager.findOne(TicketNoteEntity, {
                where: { workspaceId: input.workspaceId, requestKey: input.requestKey },
            })
            if (stored !== null && isReplay(stored, hash)) return this.viewOf(manager, ticket)
            if (input.status !== null) assertTicketTransition(ticket.status, input.status)
            const now = this.clock.now()
            await manager.insert(
                TicketNoteEntity,
                manager.create(TicketNoteEntity, {
                    id: this.ids.next(),
                    workspaceId: input.workspaceId,
                    ticketId: ticket.id,
                    body: input.note,
                    statusFrom: input.status === null ? null : ticket.status,
                    statusTo: input.status,
                    author: input.author,
                    requestKey: input.requestKey,
                    requestHash: hash,
                }),
            )
            let current = ticket
            if (input.status !== null) {
                const changes = { status: input.status, closedAt: input.status === "closed" ? now : null }
                await manager.update(TicketEntity, { id: ticket.id, workspaceId: input.workspaceId }, changes)
                current = { ...ticket, ...changes }
            }
            return this.viewOf(manager, current)
        })
    }

    private async viewOf(manager: EntityManager, ticket: TicketEntity): Promise<TicketView> {
        const codes = await this.codesOf(manager, ticket.workspaceId, [ticket])
        const notes = await manager.find(TicketNoteEntity, {
            where: { workspaceId: ticket.workspaceId, ticketId: ticket.id },
            order: { createdAt: "ASC" },
            take: 100,
        })
        return {
            ...toTicketSummary(
                ticket,
                ticket.customerId === null ? null : (codes.customers.get(ticket.customerId) ?? null),
                ticket.serviceIds.map((id) => codes.services.get(id) ?? ""),
            ),
            summary: ticket.summary,
            notes: notes.map((note) => toTicketNoteView(note)),
        }
    }

    private async codesOf(
        manager: EntityManager,
        workspaceId: string,
        tickets: ReadonlyArray<TicketEntity>,
    ): Promise<{ readonly customers: ReadonlyMap<string, string>; readonly services: ReadonlyMap<string, string> }> {
        const customerIds = [
            ...new Set(tickets.flatMap((ticket) => (ticket.customerId === null ? [] : [ticket.customerId]))),
        ]
        const serviceIds = [...new Set(tickets.flatMap((ticket) => ticket.serviceIds))]
        const customers =
            customerIds.length === 0
                ? []
                : await manager.find(CustomerEntity, {
                      where: { workspaceId, id: In(customerIds) },
                      take: customerIds.length,
                  })
        const services =
            serviceIds.length === 0
                ? []
                : await manager.find(ServiceEntity, {
                      where: { workspaceId, id: In(serviceIds) },
                      take: serviceIds.length,
                  })
        return {
            customers: new Map(customers.map((customer) => [customer.id, customer.code])),
            services: new Map(services.map((service) => [service.id, service.code])),
        }
    }
}

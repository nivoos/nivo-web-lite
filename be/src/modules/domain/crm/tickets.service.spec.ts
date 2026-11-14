import { Test } from "@nestjs/testing"
import { LessThan } from "typeorm"
import { FakeClock, type MockEntityManager, fakeIds, fakeTransaction, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { IDS } from "@modules/platform/ids"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { pageOf } from "@modules/platform/pagination"
import { WS, customerRow, serviceRow, ticketNoteRow, ticketRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { TICKET_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmErrorCode } from "./errors/crm.error"
import { CustomerEntity, ServiceEntity, TicketEntity, TicketNoteEntity } from "./persistence/entities"
import { requestHashOf } from "./request-key.policy"
import { TicketsService } from "./tickets.service"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const moduleRef = await Test.createTestingModule({
        providers: [
            TicketsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
        ],
    }).compile()
    return moduleRef.get(TicketsService)
}

const refused = (code: CrmErrorCode, params?: Record<string, unknown>): unknown =>
    expect.objectContaining(params === undefined ? { code } : { code, params })

const CREATE = {
    workspaceId: WS,
    requestKey: "zalo:conv-1:msg-1",
    customerCode: "SYN-001",
    serviceCodes: ["SYN-HOST"],
    kind: "fault" as const,
    channel: "zalo" as const,
    sourceRef: "conv-1",
    subject: "Site answers 500",
    summary: "Synthetic report",
}

const views = [
    [CustomerEntity, [customerRow()]],
    [ServiceEntity, [serviceRow()]],
] as const

const UPDATE = {
    workspaceId: WS,
    id: uuid(91),
    requestKey: "upd-1",
    status: "closed" as const,
    note: "Fixed",
    author: "Synthetic Staff",
}

describe("TicketsService", () => {
    it("opens a ticket with its customer and services", async () => {
        const em = mockEntityManager({
            findOne: [
                [TicketEntity, null],
                [CustomerEntity, customerRow()],
            ],
            find: [ServiceEntity, [serviceRow()]],
            insert: [TicketEntity, {}],
        })
        await expect((await build(em)).create(CREATE)).resolves.toEqual({
            id: uuid(1),
            customerCode: "SYN-001",
            serviceCodes: ["SYN-HOST"],
            kind: "fault",
            status: "open",
            channel: "zalo",
            sourceRef: "conv-1",
            subject: "Site answers 500",
            openedAt: NOW,
            closedAt: null,
            summary: "Synthetic report",
            notes: [],
        })
        expect(em.insert).toHaveBeenCalledWith(
            TicketEntity,
            expect.objectContaining({ serviceIds: [uuid(31)], customerId: uuid(1) }),
        )
    })
})

describe("TicketsService", () => {
    it("answers the same ticket on a repeat of the key", async () => {
        const { workspaceId: _w, requestKey: _k, ...request } = CREATE
        const stored = ticketRow({
            requestKey: CREATE.requestKey,
            requestHash: requestHashOf({ operation: "ticket.create", ...request }),
        })
        const em = mockEntityManager({ findOne: [TicketEntity, stored], find: [...views, [TicketNoteEntity, []]] })
        await expect((await build(em)).create(CREATE)).resolves.toEqual(expect.objectContaining({ id: uuid(91) }))
    })
})

describe("TicketsService", () => {
    it("refuses an unknown customer and an unknown service code", async () => {
        const customer = mockEntityManager({
            findOne: [
                [TicketEntity, null],
                [CustomerEntity, null],
            ],
        })
        await expect((await build(customer)).create(CREATE)).rejects.toEqual(refused(CrmErrorCode.CustomerNotFound))
        const service = mockEntityManager({ findOne: [TicketEntity, null], find: [ServiceEntity, []] })
        await expect((await build(service)).create({ ...CREATE, customerCode: null })).rejects.toEqual(
            refused(CrmErrorCode.TicketServiceUnknown, { serviceCode: "SYN-HOST" }),
        )
    })
})

describe("TicketsService", () => {
    it("gets a ticket with its notes and refuses an unknown one", async () => {
        const em = mockEntityManager({
            findOne: [TicketEntity, ticketRow()],
            find: [...views, [TicketNoteEntity, [ticketNoteRow()]]],
        })
        await expect((await build(em)).get({ workspaceId: WS, id: uuid(91) })).resolves.toEqual(
            expect.objectContaining({
                serviceCodes: ["SYN-HOST"],
                notes: [expect.objectContaining({ body: "Checked the logs", author: "Synthetic Staff" })],
            }),
        )
        const none = mockEntityManager({ findOne: [TicketEntity, null] })
        await expect((await build(none)).get({ workspaceId: WS, id: uuid(9) })).rejects.toEqual(
            refused(CrmErrorCode.TicketNotFound),
        )
    })
})

describe("TicketsService", () => {
    it("lists tickets of one customer and status, newest first", async () => {
        const em = mockEntityManager({
            findOne: [CustomerEntity, customerRow()],
            find: [[TicketEntity, [ticketRow()]], ...views],
        })
        await expect(
            (await build(em)).list({
                workspaceId: WS,
                customerCode: "SYN-001",
                status: "open",
                page: { limit: 20, cursor: null },
            }),
        ).resolves.toEqual({
            items: [expect.objectContaining({ id: uuid(91), customerCode: "SYN-001" })],
            nextCursor: null,
        })
        const ticketReads = em.find.mock.calls
            .filter(([entity]) => entity === TicketEntity)
            .map(([, options]) => [options?.where, options?.order])
        expect(ticketReads).toEqual([[{ workspaceId: WS, customerId: uuid(1), status: "open" }, { id: "DESC" }]])
    })
})

describe("TicketsService", () => {
    it("shows no customer code for a ticket without a customer or whose customer is gone, and an empty code for a gone service", async () => {
        const noCustomer = mockEntityManager({
            findOne: [TicketEntity, ticketRow({ customerId: null })],
            find: [
                [ServiceEntity, []],
                [TicketNoteEntity, []],
            ],
        })
        await expect((await build(noCustomer)).get({ workspaceId: WS, id: uuid(91) })).resolves.toEqual(
            expect.objectContaining({ customerCode: null, serviceCodes: [""] }),
        )
        expect(noCustomer.find).not.toHaveBeenCalledWith(CustomerEntity, expect.anything())
        const goneCustomer = mockEntityManager({
            findOne: [TicketEntity, ticketRow()],
            find: [
                [CustomerEntity, []],
                [ServiceEntity, [serviceRow()]],
                [TicketNoteEntity, []],
            ],
        })
        await expect((await build(goneCustomer)).get({ workspaceId: WS, id: uuid(91) })).resolves.toEqual(
            expect.objectContaining({ customerCode: null, serviceCodes: ["SYN-HOST"] }),
        )
    })

    it("lists every status of the workspace after a cursor, with empty codes where customer or services are gone", async () => {
        const em = mockEntityManager({
            find: [
                [
                    TicketEntity,
                    [
                        ticketRow({ customerId: null, serviceIds: [] }),
                        ticketRow({ id: uuid(92), customerId: uuid(8), serviceIds: [uuid(98)] }),
                    ],
                ],
                [CustomerEntity, []],
                [ServiceEntity, []],
            ],
        })
        const cursor = pageOf("ticket.list", [[uuid(95)], []], 1, (keys: ReadonlyArray<string>) => keys, [])
        await expect(
            (await build(em)).list({
                workspaceId: WS,
                customerCode: null,
                status: null,
                page: { limit: 20, cursor: cursor.nextCursor },
            }),
        ).resolves.toEqual({
            items: [
                expect.objectContaining({ id: uuid(91), customerCode: null, serviceCodes: [] }),
                expect.objectContaining({ id: uuid(92), customerCode: null, serviceCodes: [""] }),
            ],
            nextCursor: null,
        })
        expect(em.find.mock.calls[0]?.[1]?.where).toEqual({ workspaceId: WS, id: LessThan(uuid(95)) })
    })

    it("refuses a list of an unknown customer", async () => {
        const em = mockEntityManager({ findOne: [CustomerEntity, null] })
        await expect(
            (await build(em)).list({
                workspaceId: WS,
                customerCode: "NOPE",
                status: null,
                page: { limit: 20, cursor: null },
            }),
        ).rejects.toEqual(refused(CrmErrorCode.CustomerNotFound))
    })
})

describe("TicketsService update", () => {
    it("moves a ticket to a status other than closed and leaves closedAt empty", async () => {
        const em = mockEntityManager({
            findOne: [
                [TicketEntity, ticketRow()],
                [TicketNoteEntity, null],
            ],
            insert: [TicketNoteEntity, {}],
            update: [TicketEntity, {}],
            find: [...views, [TicketNoteEntity, []]],
        })
        await expect((await build(em)).update({ ...UPDATE, status: "in_progress" })).resolves.toEqual(
            expect.objectContaining({ status: "in_progress", closedAt: null }),
        )
        expect(em.update).toHaveBeenCalledWith(
            TicketEntity,
            { id: uuid(91), workspaceId: WS },
            { status: "in_progress", closedAt: null },
        )
    })
})

describe("TicketsService update", () => {
    it("refuses an update with neither note nor status", async () => {
        await expect(
            (await build(mockEntityManager())).update({ ...UPDATE, status: null, note: null }),
        ).rejects.toEqual(refused(CrmErrorCode.TicketUpdateEmpty))
    })
})

describe("TicketsService update", () => {
    it("adds the note, moves the status and stamps closedAt when closed", async () => {
        const em = mockEntityManager({
            findOne: [
                [TicketEntity, ticketRow()],
                [TicketNoteEntity, null],
            ],
            insert: [TicketNoteEntity, {}],
            update: [TicketEntity, {}],
            find: [...views, [TicketNoteEntity, []]],
        })
        await expect((await build(em)).update(UPDATE)).resolves.toEqual(
            expect.objectContaining({ status: "closed", closedAt: NOW }),
        )
        expect(em.insert).toHaveBeenCalledWith(
            TicketNoteEntity,
            expect.objectContaining({ statusFrom: "open", statusTo: "closed", body: "Fixed" }),
        )
        expect(em.update).toHaveBeenCalledWith(
            TicketEntity,
            { id: uuid(91), workspaceId: WS },
            { status: "closed", closedAt: new Date(NOW) },
        )
    })
})

describe("TicketsService update", () => {
    it("adds a note alone without touching the status, and refuses moving a closed ticket anywhere but open", async () => {
        const em = mockEntityManager({
            findOne: [
                [TicketEntity, ticketRow()],
                [TicketNoteEntity, null],
            ],
            insert: [TicketNoteEntity, {}],
            find: [...views, [TicketNoteEntity, []]],
        })
        await expect((await build(em)).update({ ...UPDATE, status: null })).resolves.toEqual(
            expect.objectContaining({ status: "open" }),
        )
        const closed = mockEntityManager({
            findOne: [
                [TicketEntity, ticketRow({ status: "closed", closedAt: new Date(NOW) })],
                [TicketNoteEntity, null],
            ],
        })
        await expect((await build(closed)).update({ ...UPDATE, status: "in_progress" })).rejects.toEqual(
            refused(CrmErrorCode.TicketTransitionRefused, { from: "closed", to: "in_progress" }),
        )
    })
})

describe("TicketsService update", () => {
    it("answers the ticket as it is on a repeat of the key, and refuses an unknown ticket", async () => {
        const hash = requestHashOf({
            operation: "ticket.update",
            id: uuid(91),
            status: "closed",
            note: "Fixed",
            author: "Synthetic Staff",
        })
        const repeat = mockEntityManager({
            findOne: [
                [TicketEntity, ticketRow()],
                [TicketNoteEntity, ticketNoteRow({ requestHash: hash })],
            ],
            find: [...views, [TicketNoteEntity, []]],
        })
        await expect((await build(repeat)).update(UPDATE)).resolves.toEqual(expect.objectContaining({ status: "open" }))
        const none = mockEntityManager({ findOne: [TicketEntity, null] })
        await expect((await build(none)).update(UPDATE)).rejects.toEqual(refused(CrmErrorCode.TicketNotFound))
    })
})

describe("TicketsService: one credential, one workspace", () => {
    it.each(TICKET_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call(await build(em), ws))).toEqual(NO_STRAYS)
    })
})

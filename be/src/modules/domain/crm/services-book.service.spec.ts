import { Test } from "@nestjs/testing"
import { LessThanOrEqual } from "typeorm"
import {
    FakeClock,
    type MockEntityManager,
    fakeIds,
    fakeTransaction,
    mockEntityManager,
    queueQueryBuilders,
} from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { IDS } from "@modules/platform/ids"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { decodeCursor, pageOf } from "@modules/platform/pagination"
import {
    WS,
    contactRow,
    customerRow,
    reminderRow,
    renewalRow,
    serviceRow,
    uuid,
    websiteRow,
} from "@tests/fixtures/builders/crm.builder"
import { SERVICE_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    CustomerEntity,
    RenewalRequestEntity,
    ServiceEntity,
    ServiceReminderEntity,
    WebsiteEntity,
} from "./persistence/entities"
import { requestHashOf } from "./request-key.policy"
import type { ExpiringInput } from "./service.contracts"
import { ServicesBookService } from "./services-book.service"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const moduleRef = await Test.createTestingModule({
        providers: [
            ServicesBookService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
        ],
    }).compile()
    return { book: moduleRef.get(ServicesBookService) }
}

const EXPIRING: ExpiringInput = {
    workspaceId: WS,
    asOf: "2026-11-12",
    withinDays: 30,
    includeExpired: "false",
    page: { limit: 20, cursor: null },
}

const INPUT = {
    workspaceId: WS,
    code: "SYN-HOST",
    requestKey: "remind-1",
    channel: "zalo" as const,
    outcome: "sent" as const,
    messageRef: "msg-1",
}

const HASH = requestHashOf({
    operation: "service.reminder.record",
    serviceCode: "SYN-HOST",
    channel: "zalo",
    outcome: "sent",
    messageRef: "msg-1",
})

describe("ServicesBookService", () => {
    it("lists services ending within the window with the facts the renewal agent decides on", async () => {
        const unreachable = customerRow({ id: uuid(2), code: "SYN-002", reachable: false })
        const em = mockEntityManager({
            find: [
                [
                    ServiceEntity,
                    [
                        serviceRow(),
                        serviceRow({
                            id: uuid(32),
                            code: "SYN2-TM",
                            customerId: uuid(2),
                            websiteId: null,
                            expiresOn: "2026-12-10",
                            expirySource: "estimated",
                        }),
                    ],
                ],
                [CustomerEntity, [customerRow(), unreachable]],
                [ContactEntity, []],
                [WebsiteEntity, [websiteRow()]],
                [RenewalRequestEntity, [renewalRow()]],
            ],
        })
        queueQueryBuilders(em, [
            { getRawMany: [{ id: uuid(31), count: "2", last: new Date("2026-11-09T02:00:00.000Z"), latest: "sent" }] },
        ])
        const page = await (await build(em)).book.listExpiring(EXPIRING)
        expect(
            page.items.map((item) => [
                item.code,
                item.domain,
                item.daysLeft,
                item.reachable,
                item.lastReminderOn,
                item.reminderCount,
                item.openReminder,
                item.openRenewalId,
                item.expirySource,
            ]),
        ).toEqual([
            ["SYN-HOST", "synthetic.example", 19, true, "2026-11-09", 2, true, uuid(51), "provider"],
            ["SYN2-TM", null, 28, false, null, 0, false, null, "estimated"],
        ])
        expect(page.nextCursor).toBeNull()
    })
})

describe("ServicesBookService", () => {
    it("counts a linked contact as reachable, and keys the next page by end date then code", async () => {
        const em = mockEntityManager({
            find: [
                [ServiceEntity, [serviceRow(), serviceRow({ id: uuid(32), code: "SYN-TM" })]],
                [CustomerEntity, [customerRow({ reachable: false })]],
                [ContactEntity, [contactRow()]],
                [WebsiteEntity, [websiteRow()]],
                [RenewalRequestEntity, []],
            ],
        })
        queueQueryBuilders(em, [{ getRawMany: [{ id: uuid(31), count: 1, last: null, latest: "declined" }] }])
        const page = await (
            await build(em)
        ).book.listExpiring({
            ...EXPIRING,
            page: {
                limit: 1,
                cursor: pageOf(
                    "service.expiring.list",
                    [["2026-11-20", "AAA"], []],
                    1,
                    (keys: ReadonlyArray<string>) => keys,
                    [],
                ).nextCursor,
            },
        })
        expect(page.items.map((item) => [item.reachable, item.openReminder])).toEqual([[true, false]])
        expect(decodeCursor("service.expiring.list", page.nextCursor, 2)).toEqual(["2026-12-01", "SYN-HOST"])
        expect(
            em.find.mock.calls
                .filter(([entity]) => entity === ServiceEntity)
                .map(([, options]) => options?.where)
                .flat(),
        ).toHaveLength(2)
    })
})

describe("ServicesBookService", () => {
    it("reaches back to the expired services when asked, up to the end of the window", async () => {
        const em = mockEntityManager({ find: [ServiceEntity, []] })
        const page = await (await build(em)).book.listExpiring({ ...EXPIRING, includeExpired: "true" })
        expect(page).toEqual({ items: [], nextCursor: null })
        const options: unknown = em.find.mock.calls[0]?.[1]
        expect(options).toEqual(
            expect.objectContaining({
                where: [expect.objectContaining({ workspaceId: WS, expiresOn: LessThanOrEqual("2026-12-12") })],
            }),
        )
    })

    it("lists a service with no end date, no website and no known customer as zero days left and unreachable", async () => {
        const em = mockEntityManager({
            find: [
                [
                    ServiceEntity,
                    [
                        serviceRow({ expiresOn: null, websiteId: null, customerId: uuid(9) }),
                        serviceRow({ id: uuid(32), code: "SYN-TM" }),
                    ],
                ],
                [CustomerEntity, []],
                [ContactEntity, []],
                [RenewalRequestEntity, []],
            ],
        })
        queueQueryBuilders(em, [{ getRawMany: [] }])
        const page = await (await build(em)).book.listExpiring({ ...EXPIRING, page: { limit: 1, cursor: null } })
        expect(page.items).toEqual([
            expect.objectContaining({
                code: "SYN-HOST",
                customerCode: "",
                domain: null,
                daysLeft: 0,
                reachable: false,
                lastReminderOn: null,
                reminderCount: 0,
                openReminder: false,
                openRenewalId: null,
            }),
        ])
        expect(decodeCursor("service.expiring.list", page.nextCursor, 2)).toEqual(["", "SYN-HOST"])
        expect(em.find).not.toHaveBeenCalledWith(WebsiteEntity, expect.anything())
    })

    it("lists a service whose website row is gone with no domain", async () => {
        const em = mockEntityManager({
            find: [
                [ServiceEntity, [serviceRow()]],
                [CustomerEntity, [customerRow()]],
                [ContactEntity, []],
                [WebsiteEntity, []],
                [RenewalRequestEntity, []],
            ],
        })
        queueQueryBuilders(em, [{ getRawMany: [] }])
        const page = await (await build(em)).book.listExpiring(EXPIRING)
        expect(page.items).toEqual([expect.objectContaining({ code: "SYN-HOST", domain: null, reachable: true })])
    })
})

describe("ServicesBookService", () => {
    // Owner ruling R57 (2026-11-14): the CRM is pure storage and holds no provider plugin; the state is the books' own row (the
    // provider's own state is read with the provider's tool on the agent's account), so no provider is asked and none can fail here.
    it("answers a service's state from the books: its status, its end date on today's date and that date's source", async () => {
        const em = mockEntityManager({ findOne: [ServiceEntity, serviceRow()] })
        const { book } = await build(em)
        await expect(book.status({ workspaceId: WS, code: "SYN-HOST" })).resolves.toEqual({
            serviceCode: "SYN-HOST",
            status: "active",
            state: "active",
            expiresOn: "2026-12-01",
            expirySource: "provider",
        })
    })

    it("answers expired past the stored end date and unknown when the books hold none", async () => {
        const past = mockEntityManager({ findOne: [ServiceEntity, serviceRow({ expiresOn: "2026-11-11" })] })
        await expect((await build(past)).book.status({ workspaceId: WS, code: "SYN-HOST" })).resolves.toMatchObject({
            state: "expired",
            expiresOn: "2026-11-11",
        })
        const none = mockEntityManager({
            findOne: [ServiceEntity, serviceRow({ expiresOn: null, expirySource: "none" })],
        })
        await expect((await build(none)).book.status({ workspaceId: WS, code: "SYN-HOST" })).resolves.toMatchObject({
            state: "unknown",
            expiresOn: null,
            expirySource: "none",
        })
    })
})

describe("ServicesBookService recordReminder", () => {
    it("records a reminder once and answers the record on a repeat of the key", async () => {
        const em = mockEntityManager({
            findOne: [
                [ServiceReminderEntity, null],
                [ServiceEntity, serviceRow()],
            ],
            insert: [ServiceReminderEntity, {}],
        })
        await expect((await build(em)).book.recordReminder(INPUT)).resolves.toEqual({
            id: uuid(1),
            serviceCode: "SYN-HOST",
            channel: "zalo",
            outcome: "sent",
            messageRef: "msg-1",
            sentAt: NOW,
        })
        expect(em.insert).toHaveBeenCalledWith(
            ServiceReminderEntity,
            expect.objectContaining({ requestKey: "remind-1", requestHash: HASH }),
        )
        const repeat = mockEntityManager({
            findOne: [ServiceReminderEntity, reminderRow({ requestKey: "remind-1", requestHash: HASH })],
        })
        await expect((await build(repeat)).book.recordReminder(INPUT)).resolves.toEqual(
            expect.objectContaining({ id: uuid(41) }),
        )
    })
})

describe("ServicesBookService recordReminder", () => {
    it("refuses an unknown service", async () => {
        const em = mockEntityManager({
            findOne: [
                [ServiceReminderEntity, null],
                [ServiceEntity, null],
            ],
        })
        await expect((await build(em)).book.recordReminder(INPUT)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ServiceNotFound }),
        )
    })
})

describe("ServicesBookService: one credential, one workspace", () => {
    it.each(SERVICE_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call((await build(em)).book, ws))).toEqual(NO_STRAYS)
    })
})

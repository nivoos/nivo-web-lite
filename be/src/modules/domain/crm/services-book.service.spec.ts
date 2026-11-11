import { Test } from "@nestjs/testing"
import {
    FakeClock,
    type MockEntityManager,
    fakeIds,
    fakeTransaction,
    mock,
    mockEntityManager,
    queueQueryBuilders,
} from "@starci/jest-preset"
import {
    RENEWAL_PROVIDER,
    type RenewalProviderPlugin,
    type RenewalProviderService,
} from "@modules/integrations/renewal-provider"
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
    const plugin = mock<RenewalProviderPlugin>()
    const providers = mock<RenewalProviderService>()
    providers.pluginFor.mockReturnValue(plugin)
    const moduleRef = await Test.createTestingModule({
        providers: [
            ServicesBookService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
            { provide: RENEWAL_PROVIDER, useValue: providers },
        ],
    }).compile()
    return { book: moduleRef.get(ServicesBookService), plugin }
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
    it("answers a service's state from its plugin, and a plugin failure as unavailable", async () => {
        const em = mockEntityManager({ findOne: [ServiceEntity, serviceRow()] })
        const { book, plugin } = await build(em)
        plugin.status.mockResolvedValueOnce({
            plugin: "fixture",
            state: "active",
            expiresOn: "2026-12-01",
            checkedBy: "fixture",
            note: "fixture",
        })
        await expect(book.status({ workspaceId: WS, code: "SYN-HOST" })).resolves.toEqual({
            serviceCode: "SYN-HOST",
            plugin: "fixture",
            state: "active",
            expiresOn: "2026-12-01",
            checkedBy: "fixture",
            note: "fixture",
        })
        expect(plugin.status).toHaveBeenCalledWith({
            serviceCode: "SYN-HOST",
            provider: "inet",
            expiresOn: "2026-12-01",
            today: "2026-11-12",
        })
        plugin.status.mockRejectedValueOnce(new Error("down"))
        await expect(book.status({ workspaceId: WS, code: "SYN-HOST" })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ProviderUnavailable }),
        )
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

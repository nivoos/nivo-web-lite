import { Test } from "@nestjs/testing"
import { MoreThan } from "typeorm"
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
import { decodeCursor } from "@modules/platform/pagination"
import {
    WS,
    customerRow,
    noticeRow,
    payableNoteRow,
    payableRow,
    receivablePaymentRow,
    receivableRow,
    uuid,
} from "@tests/fixtures/builders/crm.builder"
import { COLLECTION_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CollectionsService } from "./collections.service"
import { CrmErrorCode } from "./errors/crm.error"
import {
    CustomerEntity,
    LedgerBalanceEntity,
    PayableNoteEntity,
    ReceivableEntity,
    ReceivableNoticeEntity,
    ReceivablePaymentEntity,
    RenewalRequestEntity,
} from "./persistence/entities"
import { requestHashOf } from "./request-key.policy"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const moduleRef = await Test.createTestingModule({
        providers: [
            CollectionsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
        ],
    }).compile()
    return moduleRef.get(CollectionsService)
}

/** A cursor of `list` at `keys`, as the pagination policy hands it out. */
const encodeCursor = (list: string, keys: ReadonlyArray<string>): string =>
    Buffer.from(JSON.stringify({ l: list, k: keys }), "utf8").toString("base64url")

const refused = (code: CrmErrorCode): unknown => expect.objectContaining({ code })

const INPUT = {
    workspaceId: WS,
    projectCode: "SYN-WEB",
    requestKey: "notice-1",
    channel: "email" as const,
    messageRef: null,
}

const HASH = requestHashOf({
    operation: "receivable.notice.record",
    projectCode: "SYN-WEB",
    channel: "email",
    messageRef: null,
})

const RECORDRECEIVABLEPAYMENT_INPUT = { workspaceId: WS, projectCode: "SYN-WEB", transactionRef: "BANK-1" }

const RECORDPAYABLENOTE_INPUT = {
    workspaceId: WS,
    partyCode: "SUP-1",
    requestKey: "note-1",
    invoiceNo: "00000001",
    issuedOn: "2026-11-01",
    einvoiceRef: null,
    note: null,
}

const RECORDPAYABLENOTE_HASH = requestHashOf({
    operation: "payable.note.record",
    partyCode: "SUP-1",
    invoiceNo: "00000001",
    issuedOn: "2026-11-01",
    einvoiceRef: null,
    note: null,
})

describe("CollectionsService", () => {
    it("lists overdue and undated receivables with remaining > 0, with notice and payment facts", async () => {
        const em = mockEntityManager({
            find: [
                [
                    ReceivableEntity,
                    [
                        receivableRow(),
                        receivableRow({ id: uuid(62), projectCode: "SYN-WEB2", dueOn: null, customerId: null }),
                    ],
                ],
                [CustomerEntity, [customerRow()]],
            ],
        })
        const [notices, payments] = queueQueryBuilders(em, [
            { getRawMany: [{ id: uuid(61), count: "2", last: new Date("2026-11-11T18:00:00.000Z") }] },
            { getRawMany: [{ id: uuid(61), count: "1" }] },
        ])
        const service = await build(em)
        const page = await service.listOverdue({
            workspaceId: WS,
            asOf: "2026-11-12",
            page: { limit: 1, cursor: null },
        })
        expect(page.items).toEqual([
            {
                projectCode: "SYN-WEB",
                customerCode: "SYN-001",
                contractRef: null,
                totalVnd: 10_000_000,
                collectedVnd: 4_000_000,
                remainingVnd: 6_000_000,
                dueOn: "2026-10-01",
                projectState: null,
                lastNoticeOn: "2026-11-12",
                noticeCount: 2,
                paymentCount: 1,
            },
        ])
        expect(decodeCursor("receivable.overdue.list", page.nextCursor, 1)).toEqual(["SYN-WEB"])
        expect(notices?.callsOf("andWhere")).toEqual([["n.receivable_id IN (:...ids)", { ids: [uuid(61)] }]])
        expect(payments?.callsOf("groupBy")).toEqual([["p.receivable_id"]])
    })
})

describe("CollectionsService", () => {
    it("continues the overdue list after the cursor's project code, and says unknown facts as null and zero", async () => {
        const em = mockEntityManager({
            find: [
                [ReceivableEntity, [receivableRow({ id: uuid(62), projectCode: "SYN-B", customerId: uuid(99) })]],
                [CustomerEntity, [customerRow()]],
            ],
        })
        queueQueryBuilders(em, [{ getRawMany: [] }, { getRawMany: [] }])
        const page = await (
            await build(em)
        ).listOverdue({
            workspaceId: WS,
            asOf: "2026-11-12",
            page: { limit: 20, cursor: encodeCursor("receivable.overdue.list", ["SYN-A"]) },
        })
        expect(page.items).toEqual([
            expect.objectContaining({
                projectCode: "SYN-B",
                customerCode: null,
                lastNoticeOn: null,
                noticeCount: 0,
                paymentCount: 0,
            }),
        ])
        expect(em.find).toHaveBeenCalledWith(
            ReceivableEntity,
            expect.objectContaining({
                where: [
                    expect.objectContaining({ workspaceId: WS, projectCode: MoreThan("SYN-A") }),
                    expect.objectContaining({ workspaceId: WS, projectCode: MoreThan("SYN-A") }),
                ],
            }),
        )
    })

    it("reads no customers when no receivable has one, and answers a notice without a sent time as no notice day", async () => {
        const em = mockEntityManager({
            find: [ReceivableEntity, [receivableRow({ customerId: null })]],
        })
        queueQueryBuilders(em, [{ getRawMany: [{ id: uuid(61), count: "1", last: null }] }, { getRawMany: [] }])
        const page = await (
            await build(em)
        ).listOverdue({ workspaceId: WS, asOf: "2026-11-12", page: { limit: 20, cursor: null } })
        expect(page.items).toEqual([
            expect.objectContaining({ customerCode: null, lastNoticeOn: null, noticeCount: 1, paymentCount: 0 }),
        ])
        expect(em.find).not.toHaveBeenCalledWith(CustomerEntity, expect.anything())
    })

    it("drops a receivable whose view is missing from the page", async () => {
        const em = mockEntityManager({ find: [ReceivableEntity, [receivableRow()]] })
        const service = await build(em)
        jest.spyOn(service, "receivableViews").mockResolvedValue(new Map())
        await expect(
            service.listOverdue({ workspaceId: WS, asOf: "2026-11-12", page: { limit: 20, cursor: null } }),
        ).resolves.toEqual({ items: [], nextCursor: null })
    })
})

describe("CollectionsService", () => {
    it("answers an empty page without reading facts", async () => {
        const service = await build(mockEntityManager({ find: [ReceivableEntity, []] }))
        await expect(
            service.listOverdue({ workspaceId: WS, asOf: null, page: { limit: 20, cursor: null } }),
        ).resolves.toEqual({ items: [], nextCursor: null })
    })
})

describe("CollectionsService recordNotice", () => {
    it("records a notice once and answers the record on a repeat of the key", async () => {
        const em = mockEntityManager({
            findOne: [
                [ReceivableNoticeEntity, null],
                [ReceivableEntity, receivableRow()],
            ],
            insert: [ReceivableNoticeEntity, {}],
        })
        await expect((await build(em)).recordNotice(INPUT)).resolves.toEqual({
            id: uuid(1),
            projectCode: "SYN-WEB",
            channel: "email",
            messageRef: null,
            sentAt: NOW,
        })
        const repeat = mockEntityManager({ findOne: [ReceivableNoticeEntity, noticeRow({ requestHash: HASH })] })
        await expect((await build(repeat)).recordNotice(INPUT)).resolves.toEqual(
            expect.objectContaining({ id: uuid(71) }),
        )
    })
})

describe("CollectionsService recordNotice", () => {
    it("refuses a reused key and an unknown receivable", async () => {
        const reused = mockEntityManager({
            findOne: [ReceivableNoticeEntity, noticeRow({ requestHash: "f".repeat(64) })],
        })
        await expect((await build(reused)).recordNotice(INPUT)).rejects.toEqual(
            refused(CrmErrorCode.IdempotencyKeyReused),
        )
        const unknown = mockEntityManager({
            findOne: [
                [ReceivableNoticeEntity, null],
                [ReceivableEntity, null],
            ],
        })
        await expect((await build(unknown)).recordNotice(INPUT)).rejects.toEqual(
            refused(CrmErrorCode.ReceivableNotFound),
        )
    })
})

describe("CollectionsService recordReceivablePayment", () => {
    it("records a payment by bank reference and answers the same record for the same reference", async () => {
        const em = mockEntityManager({
            findOne: [
                [ReceivableEntity, receivableRow()],
                [ReceivablePaymentEntity, null],
            ],
            exists: [RenewalRequestEntity, false],
            insert: [ReceivablePaymentEntity, {}],
        })
        await expect((await build(em)).recordReceivablePayment(RECORDRECEIVABLEPAYMENT_INPUT)).resolves.toEqual({
            id: uuid(1),
            projectCode: "SYN-WEB",
            transactionRef: "BANK-1",
            recordedAt: NOW,
        })
        const repeat = mockEntityManager({
            findOne: [
                [ReceivableEntity, receivableRow()],
                [ReceivablePaymentEntity, receivablePaymentRow()],
            ],
        })
        await expect((await build(repeat)).recordReceivablePayment(RECORDRECEIVABLEPAYMENT_INPUT)).resolves.toEqual(
            expect.objectContaining({ id: uuid(72) }),
        )
    })
})

describe("CollectionsService recordReceivablePayment", () => {
    it("refuses a bank reference already used for another receivable or a renewal", async () => {
        const other = mockEntityManager({
            findOne: [
                [ReceivableEntity, receivableRow()],
                [ReceivablePaymentEntity, receivablePaymentRow({ receivableId: uuid(69) })],
            ],
        })
        await expect((await build(other)).recordReceivablePayment(RECORDRECEIVABLEPAYMENT_INPUT)).rejects.toEqual(
            refused(CrmErrorCode.TransactionUsed),
        )
        const renewal = mockEntityManager({
            findOne: [
                [ReceivableEntity, receivableRow()],
                [ReceivablePaymentEntity, null],
            ],
            exists: [RenewalRequestEntity, true],
        })
        await expect((await build(renewal)).recordReceivablePayment(RECORDRECEIVABLEPAYMENT_INPUT)).rejects.toEqual(
            refused(CrmErrorCode.TransactionUsed),
        )
    })
})

describe("CollectionsService", () => {
    it("lists TK331 parties with their notes", async () => {
        const em = mockEntityManager({ find: [LedgerBalanceEntity, [payableRow()]] })
        queueQueryBuilders(em, [{ getRawMany: [{ id: "SUP-1", count: 3, last: null, latest: "00000009" }] }])
        await expect(
            (await build(em)).listPayables({ workspaceId: WS, page: { limit: 20, cursor: null } }),
        ).resolves.toEqual({
            items: [
                {
                    partyCode: "SUP-1",
                    partyName: "Synthetic Supplier",
                    closingCreditVnd: 500_000,
                    closingDebitVnd: 0,
                    noteCount: 3,
                    lastNoteInvoiceNo: "00000009",
                },
            ],
            nextCursor: null,
        })
    })
})

describe("CollectionsService", () => {
    it("continues the payables after the cursor's party code and answers parties without notes", async () => {
        const em = mockEntityManager({ find: [LedgerBalanceEntity, [payableRow({ partyCode: "SUP-2" })]] })
        queueQueryBuilders(em, [{ getRawMany: [] }])
        await expect(
            (await build(em)).listPayables({
                workspaceId: WS,
                page: { limit: 20, cursor: encodeCursor("payable.list", ["SUP-1"]) },
            }),
        ).resolves.toEqual({
            items: [expect.objectContaining({ partyCode: "SUP-2", noteCount: 0, lastNoteInvoiceNo: null })],
            nextCursor: null,
        })
        expect(em.find).toHaveBeenCalledWith(
            LedgerBalanceEntity,
            expect.objectContaining({
                where: { workspaceId: WS, account: "331", partyCode: MoreThan("SUP-1") },
            }),
        )
    })

    it("answers an empty payables page without reading notes", async () => {
        const em = mockEntityManager({ find: [LedgerBalanceEntity, []] })
        await expect(
            (await build(em)).listPayables({ workspaceId: WS, page: { limit: 20, cursor: null } }),
        ).resolves.toEqual({ items: [], nextCursor: null })
        expect(em.createQueryBuilder).not.toHaveBeenCalled()
    })
})

describe("CollectionsService recordPayableNote", () => {
    it("notes a supplier invoice against a known party, once per key", async () => {
        const em = mockEntityManager({
            findOne: [PayableNoteEntity, null],
            exists: [LedgerBalanceEntity, true],
            insert: [PayableNoteEntity, {}],
        })
        await expect((await build(em)).recordPayableNote(RECORDPAYABLENOTE_INPUT)).resolves.toEqual(
            expect.objectContaining({ id: uuid(1), partyCode: "SUP-1", invoiceNo: "00000001", recordedAt: NOW }),
        )
        const repeat = mockEntityManager({
            findOne: [PayableNoteEntity, payableNoteRow({ requestHash: RECORDPAYABLENOTE_HASH })],
        })
        await expect((await build(repeat)).recordPayableNote(RECORDPAYABLENOTE_INPUT)).resolves.toEqual(
            expect.objectContaining({ id: uuid(82) }),
        )
    })
})

describe("CollectionsService recordPayableNote", () => {
    it("refuses an unknown party", async () => {
        const em = mockEntityManager({ findOne: [PayableNoteEntity, null], exists: [LedgerBalanceEntity, false] })
        await expect((await build(em)).recordPayableNote(RECORDPAYABLENOTE_INPUT)).rejects.toEqual(
            refused(CrmErrorCode.PayableNotFound),
        )
    })
})

describe("CollectionsService: one credential, one workspace", () => {
    it.each(COLLECTION_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call(await build(em), ws))).toEqual(NO_STRAYS)
    })
})

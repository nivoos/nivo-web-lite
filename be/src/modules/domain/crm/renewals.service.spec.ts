import { Test } from "@nestjs/testing"
import { In, MoreThan } from "typeorm"
import { FakeClock, type MockEntityManager, fakeIds, fakeTransaction, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { IDS } from "@modules/platform/ids"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { isRecord } from "@modules/platform/primitives"
import { WS, customerRow, renewalRow, serviceRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { RENEWAL_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmErrorCode } from "./errors/crm.error"
import { CustomerEntity, ReceivablePaymentEntity, RenewalRequestEntity, ServiceEntity } from "./persistence/entities"
import { paymentCodeOf } from "./price.policy"
import { RenewalsService } from "./renewals.service"
import { requestHashOf } from "./request-key.policy"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    const transaction = fakeTransaction(em)
    const moduleRef = await Test.createTestingModule({
        providers: [
            RenewalsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
        ],
    }).compile()
    return { renewals: moduleRef.get(RenewalsService), transaction }
}

const refused = (code: CrmErrorCode, params?: Record<string, unknown>): unknown =>
    expect.objectContaining(params === undefined ? { code } : { code, params })

const QUOTE = { workspaceId: WS, requestKey: "zalo:conv-1:yes", serviceCode: "SYN-HOST", termMonths: 12 }
const QUOTE_HASH = requestHashOf({ operation: "renewal.quote.create", serviceCode: "SYN-HOST", termMonths: 12 })

const viewStubs = [
    [ServiceEntity, serviceRow()],
    [CustomerEntity, customerRow()],
] as const

describe("RenewalsService quote", () => {
    it("opens a request awaiting payment with the CRM's own total and transfer code", async () => {
        const em = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, serviceRow()],
                [CustomerEntity, customerRow()],
            ],
            insert: [RenewalRequestEntity, {}],
        })
        const { renewals, transaction } = await build(em)
        const view = await renewals.quote(QUOTE)
        const id = uuid(1)
        expect(view).toEqual(
            expect.objectContaining({
                id,
                serviceCode: "SYN-HOST",
                customerCode: "SYN-001",
                provider: "inet",
                state: "awaiting_payment",
                netVnd: 1_200_000,
                vatVnd: 120_000,
                totalVnd: 1_320_000,
                priceSource: "placeholder",
                paymentCode: paymentCodeOf(id, "GH"),
                providerRef: null,
                createdAt: NOW,
            }),
        )
        expect(em.insert).toHaveBeenCalledWith(
            RenewalRequestEntity,
            expect.objectContaining({ requestKey: QUOTE.requestKey, requestHash: QUOTE_HASH }),
        )
        expect(transaction.commits).toBe(1)
    })
})

describe("RenewalsService quote", () => {
    it("answers the stored request on a repeat of the key and refuses the key with another request", async () => {
        const stored = renewalRow({ requestKey: QUOTE.requestKey, requestHash: QUOTE_HASH })
        const em = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, stored],
                [ServiceEntity, serviceRow()],
                [CustomerEntity, customerRow()],
            ],
        })
        const { renewals } = await build(em)
        await expect(renewals.quote(QUOTE)).resolves.toEqual(expect.objectContaining({ id: stored.id }))
        await expect(renewals.quote({ ...QUOTE, termMonths: 24 })).rejects.toEqual(
            refused(CrmErrorCode.IdempotencyKeyReused),
        )
    })
})

describe("RenewalsService quote", () => {
    it("refuses a second open request, an unpriced term, a service that is not renewable and an unknown service", async () => {
        const open = renewalRow()
        const withOpen = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, serviceRow()],
                [RenewalRequestEntity, open],
            ],
        })
        await expect((await build(withOpen)).renewals.quote(QUOTE)).rejects.toEqual(
            refused(CrmErrorCode.RenewalOpenExists, { renewalId: open.id }),
        )

        const priced = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, serviceRow()],
            ],
        })
        await expect((await build(priced)).renewals.quote({ ...QUOTE, termMonths: 6 })).rejects.toEqual(
            refused(CrmErrorCode.PriceUnknown, { serviceClass: "hosting", termMonths: 6 }),
        )

        const cancelled = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, serviceRow({ status: "cancelled" })],
            ],
        })
        await expect((await build(cancelled)).renewals.quote(QUOTE)).rejects.toEqual(
            refused(CrmErrorCode.ServiceNotRenewable, { status: "cancelled" }),
        )

        const unknown = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, null],
            ],
        })
        await expect((await build(unknown)).renewals.quote(QUOTE)).rejects.toEqual(
            refused(CrmErrorCode.ServiceNotFound),
        )
    })
})

describe("RenewalsService quote", () => {
    it("names the provider manual when the service has none", async () => {
        const em = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, null],
                [ServiceEntity, serviceRow({ provider: null })],
                [CustomerEntity, customerRow()],
            ],
            insert: [RenewalRequestEntity, {}],
        })
        await expect((await build(em)).renewals.quote(QUOTE)).resolves.toEqual(
            expect.objectContaining({ provider: "manual", state: "awaiting_payment" }),
        )
        expect(em.insert).toHaveBeenCalledWith(RenewalRequestEntity, expect.objectContaining({ provider: "manual" }))
    })
})

describe("RenewalsService get and listOpen", () => {
    it("returns one request with its service and customer codes", async () => {
        const em = mockEntityManager({ findOne: [[RenewalRequestEntity, renewalRow()], ...viewStubs] })
        await expect((await build(em)).renewals.get({ workspaceId: WS, id: uuid(51) })).resolves.toEqual(
            expect.objectContaining({ id: uuid(51), serviceCode: "SYN-HOST", customerCode: "SYN-001" }),
        )
    })

    it("refuses a request whose service is gone and shows an empty customer code when the customer is gone", async () => {
        const gone = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, renewalRow()],
                [ServiceEntity, null],
            ],
        })
        await expect((await build(gone)).renewals.get({ workspaceId: WS, id: uuid(51) })).rejects.toEqual(
            refused(CrmErrorCode.ServiceNotFound),
        )
        const orphan = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, renewalRow()],
                [ServiceEntity, serviceRow()],
                [CustomerEntity, null],
            ],
        })
        await expect((await build(orphan)).renewals.get({ workspaceId: WS, id: uuid(51) })).resolves.toEqual(
            expect.objectContaining({ serviceCode: "SYN-HOST", customerCode: "" }),
        )
    })

    it("refuses an unknown request", async () => {
        const { renewals } = await build(mockEntityManager({ findOne: [RenewalRequestEntity, null] }))
        await expect(renewals.get({ workspaceId: WS, id: uuid(9) })).rejects.toEqual(
            refused(CrmErrorCode.RenewalNotFound),
        )
    })
})

describe("RenewalsService get and listOpen", () => {
    it("lists open requests of one customer with their service and customer codes", async () => {
        const em = mockEntityManager({
            findOne: [CustomerEntity, customerRow()],
            find: [
                [ServiceEntity, [serviceRow()]],
                [RenewalRequestEntity, [renewalRow()]],
                [CustomerEntity, [customerRow()]],
            ],
        })
        const { renewals } = await build(em)
        const open = { customerCode: "SYN-001", state: "awaiting_payment", page: { limit: 20, cursor: null } } as const
        const page = await renewals.listOpen({ workspaceId: WS, ...open })
        expect(page).toEqual({
            items: [expect.objectContaining({ id: uuid(51), serviceCode: "SYN-HOST", customerCode: "SYN-001" })],
            nextCursor: null,
        })
        const options: unknown = em.find.mock.calls[1]?.[1]
        const where: unknown = isRecord(options) ? options["where"] : undefined
        expect(isRecord(where) ? where["state"] : undefined).toEqual(In(["awaiting_payment"]))
    })
})

describe("RenewalsService get and listOpen", () => {
    it("lists every open state of the workspace after a cursor and answers an empty page without reading codes", async () => {
        const first = mockEntityManager({
            find: [
                [RenewalRequestEntity, [renewalRow(), renewalRow({ id: uuid(52) })]],
                [ServiceEntity, [serviceRow()]],
                [CustomerEntity, [customerRow()]],
            ],
        })
        const open = { customerCode: null, state: null } as const
        const head = await (
            await build(first)
        ).renewals.listOpen({
            workspaceId: WS,
            ...open,
            page: { limit: 1, cursor: null },
        })
        expect(head.nextCursor).not.toBeNull()
        const em = mockEntityManager({ find: [RenewalRequestEntity, []] })
        const { renewals } = await build(em)
        await expect(
            renewals.listOpen({ workspaceId: WS, ...open, page: { limit: 20, cursor: head.nextCursor } }),
        ).resolves.toEqual({ items: [], nextCursor: null })
        expect(em.find).toHaveBeenCalledTimes(1)
        const options: unknown = em.find.mock.calls[0]?.[1]
        const where: unknown = isRecord(options) ? options["where"] : undefined
        expect(isRecord(where) ? where["state"] : undefined).toEqual(In(["awaiting_payment", "paid", "pending_person"]))
        expect(isRecord(where) ? where["id"] : undefined).toEqual(MoreThan(uuid(51)))
    })
})

describe("RenewalsService get and listOpen", () => {
    it("shows empty codes for a request whose service or customer is gone", async () => {
        const noService = mockEntityManager({
            find: [
                [RenewalRequestEntity, [renewalRow()]],
                [ServiceEntity, []],
                [CustomerEntity, []],
            ],
        })
        const open = { customerCode: null, state: null, page: { limit: 20, cursor: null } } as const
        await expect((await build(noService)).renewals.listOpen({ workspaceId: WS, ...open })).resolves.toEqual({
            items: [expect.objectContaining({ serviceCode: "", customerCode: "" })],
            nextCursor: null,
        })
        const noCustomer = mockEntityManager({
            find: [
                [RenewalRequestEntity, [renewalRow()]],
                [ServiceEntity, [serviceRow()]],
                [CustomerEntity, []],
            ],
        })
        await expect((await build(noCustomer)).renewals.listOpen({ workspaceId: WS, ...open })).resolves.toEqual({
            items: [expect.objectContaining({ serviceCode: "SYN-HOST", customerCode: "" })],
            nextCursor: null,
        })
    })

    it("refuses an unknown customer filter", async () => {
        const { renewals } = await build(mockEntityManager({ findOne: [CustomerEntity, null] }))
        await expect(
            renewals.listOpen({
                workspaceId: WS,
                customerCode: "NOPE",
                state: null,
                page: { limit: 20, cursor: null },
            }),
        ).rejects.toEqual(refused(CrmErrorCode.CustomerNotFound))
    })
})

describe("RenewalsService recordPayment", () => {
    it("marks an awaiting request paid by the bank row, with no amount taken", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow()], ...viewStubs],
            exists: [
                [RenewalRequestEntity, false],
                [ReceivablePaymentEntity, false],
            ],
            update: [RenewalRequestEntity, {}],
        })
        const { renewals } = await build(em)
        await expect(
            renewals.recordPayment({ workspaceId: WS, id: uuid(51), transactionRef: "BANK-9" }),
        ).resolves.toEqual(expect.objectContaining({ state: "paid", transactionRef: "BANK-9", paidAt: NOW }))
        expect(em.update).toHaveBeenCalledWith(
            RenewalRequestEntity,
            { id: uuid(51), workspaceId: WS },
            { state: "paid", transactionRef: "BANK-9", paidAt: new Date(NOW) },
        )
    })
})

describe("RenewalsService recordPayment", () => {
    it("answers the same request for the same bank row without writing", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })], ...viewStubs],
        })
        await expect(
            (await build(em)).renewals.recordPayment({ workspaceId: WS, id: uuid(51), transactionRef: "BANK-9" }),
        ).resolves.toEqual(expect.objectContaining({ state: "paid" }))
    })
})

describe("RenewalsService recordPayment", () => {
    it("refuses a request that no longer awaits payment and a bank row used elsewhere", async () => {
        const paid = mockEntityManager({
            findOne: [RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-1" })],
        })
        await expect(
            (await build(paid)).renewals.recordPayment({ workspaceId: WS, id: uuid(51), transactionRef: "BANK-9" }),
        ).rejects.toEqual(refused(CrmErrorCode.RenewalStateRefused, { state: "paid" }))
        const used = mockEntityManager({
            findOne: [RenewalRequestEntity, renewalRow()],
            exists: [
                [RenewalRequestEntity, false],
                [ReceivablePaymentEntity, true],
            ],
        })
        await expect(
            (await build(used)).renewals.recordPayment({ workspaceId: WS, id: uuid(51), transactionRef: "BANK-9" }),
        ).rejects.toEqual(refused(CrmErrorCode.TransactionUsed))
    })
})

/** The outcome the Renewal agent records after the provider answered (owner ruling R57: the agent renews at the provider). */
const OUTCOME = {
    workspaceId: WS,
    id: uuid(51),
    providerRef: "INET-ORDER-1",
    newExpiresOn: null,
    confirmedBy: "webrenew",
    note: null,
} as const

describe("RenewalsService recordOutcome", () => {
    // Owner ruling R57 (2026-11-14): the CRM's own provider step (`service.renewal.create`, plugins manual/fixture) is gone; the agent
    // renews at the provider and records the answer on the PAID request, so `renewed` is recorded from `paid` (it was `pending_person`).
    it("records renewed on a paid request with the provider's reference and moves the service's end date as confirmed", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })], ...viewStubs],
            update: [
                [RenewalRequestEntity, {}],
                [ServiceEntity, {}],
            ],
        })
        const { renewals } = await build(em)
        await expect(
            renewals.recordOutcome({ ...OUTCOME, outcome: "renewed", newExpiresOn: "2027-12-01" }),
        ).resolves.toEqual(
            expect.objectContaining({
                state: "renewed",
                providerRef: "INET-ORDER-1",
                newExpiresOn: "2027-12-01",
                confirmedBy: "webrenew",
                confirmedAt: NOW,
            }),
        )
        expect(em.update).toHaveBeenCalledWith(
            ServiceEntity,
            { id: uuid(31), workspaceId: WS },
            { expiresOn: "2027-12-01", expirySource: "confirmed", status: "active" },
        )
    })
})

describe("RenewalsService recordOutcome", () => {
    it("records a pending provider answer as waiting for a person, then a person closes it renewed", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })], ...viewStubs],
            update: [RenewalRequestEntity, {}],
        })
        const { renewals } = await build(em)
        await expect(renewals.recordOutcome({ ...OUTCOME, outcome: "pending" })).resolves.toEqual(
            expect.objectContaining({ state: "pending_person", providerRef: "INET-ORDER-1", newExpiresOn: null }),
        )
        expect(em.update).toHaveBeenCalledTimes(1)
        const waiting = mockEntityManager({
            findOne: [
                [
                    RenewalRequestEntity,
                    renewalRow({ state: "pending_person", transactionRef: "BANK-9", providerRef: "INET-ORDER-1" }),
                ],
                ...viewStubs,
            ],
            update: [
                [RenewalRequestEntity, {}],
                [ServiceEntity, {}],
            ],
        })
        await expect(
            (await build(waiting)).renewals.recordOutcome({
                ...OUTCOME,
                outcome: "renewed",
                providerRef: null,
                newExpiresOn: "2027-12-01",
                confirmedBy: "Synthetic Staff",
            }),
        ).resolves.toEqual(
            expect.objectContaining({ state: "renewed", providerRef: "INET-ORDER-1", confirmedBy: "Synthetic Staff" }),
        )
    })
})

describe("RenewalsService recordOutcome", () => {
    it("records failed without touching the service, answers a repeat, and refuses an unpaid or a closed request", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })], ...viewStubs],
            update: [RenewalRequestEntity, {}],
        })
        const { renewals } = await build(em)
        await expect(
            renewals.recordOutcome({ ...OUTCOME, outcome: "failed", note: "insufficient_balance" }),
        ).resolves.toEqual(expect.objectContaining({ state: "failed" }))
        expect(em.update).toHaveBeenCalledTimes(1)
        const repeat = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "failed", confirmedBy: "webrenew" })], ...viewStubs],
        })
        const again = await build(repeat)
        await expect(again.renewals.recordOutcome({ ...OUTCOME, outcome: "failed" })).resolves.toEqual(
            expect.objectContaining({ state: "failed" }),
        )
        expect(repeat.update).not.toHaveBeenCalled()
        const unpaid = mockEntityManager({ findOne: [RenewalRequestEntity, renewalRow({ state: "awaiting_payment" })] })
        await expect((await build(unpaid)).renewals.recordOutcome({ ...OUTCOME, outcome: "renewed" })).rejects.toEqual(
            refused(CrmErrorCode.RenewalNotPaid, { state: "awaiting_payment" }),
        )
        const closed = mockEntityManager({ findOne: [RenewalRequestEntity, renewalRow({ state: "renewed" })] })
        await expect((await build(closed)).renewals.recordOutcome({ ...OUTCOME, outcome: "failed" })).rejects.toEqual(
            refused(CrmErrorCode.RenewalStateRefused, { state: "renewed" }),
        )
    })
})

describe("RenewalsService: one credential, one workspace", () => {
    it.each(RENEWAL_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call((await build(em)).renewals, ws))).toEqual(NO_STRAYS)
    })
})

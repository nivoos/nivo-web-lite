import { Test } from "@nestjs/testing"
import {
    FakeClock,
    type MockEntityManager,
    fakeIds,
    fakeTransaction,
    mock,
    mockEntityManager,
} from "@starci/jest-preset"
import {
    RENEWAL_PROVIDER,
    type RenewalProviderPlugin,
    type RenewalProviderService,
} from "@modules/integrations/renewal-provider"
import { CLOCK } from "@modules/platform/clock"
import { IDS } from "@modules/platform/ids"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { decodeCursor } from "@modules/platform/pagination"
import { WS, customerRow, renewalRow, serviceRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { CrmErrorCode } from "./errors/crm.error"
import {
    CustomerEntity,
    ProviderAccountEntity,
    ReceivablePaymentEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"
import { paymentCodeOf } from "./price.policy"
import { RenewalsService } from "./renewals.service"
import { requestHashOf } from "./request-key.policy"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    const transaction = fakeTransaction(em)
    const plugin = mock<RenewalProviderPlugin>()
    const providers = mock<RenewalProviderService>()
    providers.pluginFor.mockReturnValue(plugin)
    const moduleRef = await Test.createTestingModule({
        providers: [
            RenewalsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
            { provide: RENEWAL_PROVIDER, useValue: providers },
        ],
    }).compile()
    return { renewals: moduleRef.get(RenewalsService), plugin, providers, transaction }
}

const refused = (code: CrmErrorCode, params?: Record<string, unknown>): unknown =>
    expect.objectContaining(params === undefined ? { code } : { code, params })

const QUOTE = { workspaceId: WS, requestKey: "zalo:conv-1:yes", serviceCode: "SYN-HOST", termMonths: 12 }
const QUOTE_HASH = requestHashOf({ operation: "renewal.quote.create", serviceCode: "SYN-HOST", termMonths: 12 })

const viewStubs = [
    [ServiceEntity, serviceRow()],
    [CustomerEntity, customerRow()],
] as const

const INPUT = {
    workspaceId: WS,
    serviceCode: "SYN-HOST",
    renewalId: uuid(51),
    requestKey: "renew-1",
    dryRun: false,
}

const HASH = requestHashOf({
    operation: "service.renewal.create",
    serviceCode: "SYN-HOST",
    renewalId: uuid(51),
    dryRun: false,
})

/** The reads and writes of one provider step on a request in `state`. */
const executeStubs = (state: "awaiting_payment" | "paid", transactionRef: string | null) =>
    ({
        findOne: [
            [RenewalRequestEntity, renewalRow({ state, transactionRef })],
            [ServiceEntity, serviceRow()],
            [RenewalRequestEntity, null],
            [CustomerEntity, customerRow()],
        ],
        update: [RenewalRequestEntity, {}],
        exists: [ProviderAccountEntity, false],
    }) as const

describe("RenewalsService listPrices", () => {
    it("pages the placeholder table by class and term", async () => {
        const { renewals } = await build(mockEntityManager())
        const first = await renewals.listPrices({ workspaceId: WS, page: { limit: 4, cursor: null } })
        expect(first.items.map((price) => `${price.serviceClass}:${price.termMonths}`)).toEqual([
            "domain:12",
            "domain:24",
            "domain:36",
            "hosting:12",
        ])
        expect(decodeCursor("price.list", first.nextCursor, 1)).toEqual(["hosting:12"])
        const last = await renewals.listPrices({ workspaceId: WS, page: { limit: 50, cursor: first.nextCursor } })
        expect([
            last.items.length,
            last.nextCursor,
            last.items.every((price) => price.priceSource === "placeholder"),
        ]).toEqual([5, null, true])
    })
})

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
                paymentCode: paymentCodeOf(id),
                dryRun: true,
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

describe("RenewalsService get and listOpen", () => {
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
        const page = await renewals.listOpen({
            workspaceId: WS,
            customerCode: "SYN-001",
            page: { limit: 20, cursor: null },
        })
        expect(page).toEqual({
            items: [expect.objectContaining({ id: uuid(51), serviceCode: "SYN-HOST", customerCode: "SYN-001" })],
            nextCursor: null,
        })
    })
})

describe("RenewalsService get and listOpen", () => {
    it("refuses an unknown customer filter", async () => {
        const { renewals } = await build(mockEntityManager({ findOne: [CustomerEntity, null] }))
        await expect(
            renewals.listOpen({ workspaceId: WS, customerCode: "NOPE", page: { limit: 20, cursor: null } }),
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

describe("RenewalsService execute (service.renewal.create)", () => {
    it("refuses an unpaid request (pay first) without asking any provider", async () => {
        const { renewals, plugin } = await build(mockEntityManager(executeStubs("awaiting_payment", null)))
        await expect(renewals.execute(INPUT)).rejects.toEqual(
            refused(CrmErrorCode.RenewalNotPaid, { state: "awaiting_payment" }),
        )
        expect(plugin.renew).not.toHaveBeenCalled()
    })
})

describe("RenewalsService execute (service.renewal.create)", () => {
    it("claims a paid request, asks its plugin outside the transaction (dry while no live account) and records the answer", async () => {
        const em = mockEntityManager(executeStubs("paid", "BANK-9"))
        const { renewals, plugin, transaction } = await build(em)
        plugin.renew.mockResolvedValue({
            plugin: "fixture",
            state: "renewed",
            providerRef: "FIXTURE-00000000",
            newExpiresOn: "2027-12-01",
            dryRun: true,
        })
        await expect(renewals.execute(INPUT)).resolves.toEqual(
            expect.objectContaining({
                state: "renewed",
                plugin: "fixture",
                providerRef: "FIXTURE-00000000",
                newExpiresOn: "2027-12-01",
                dryRun: true,
            }),
        )
        expect(plugin.renew).toHaveBeenCalledWith(
            expect.objectContaining({ renewalId: uuid(51), termMonths: 12, dryRun: true, today: "2026-11-12" }),
        )
        expect(em.update).toHaveBeenNthCalledWith(
            1,
            RenewalRequestEntity,
            { id: uuid(51), workspaceId: WS },
            { executeKey: "renew-1", executeHash: HASH, executedAt: new Date(NOW) },
        )
        expect(transaction.commits).toBe(2)
    })
})

describe("RenewalsService execute (service.renewal.create)", () => {
    it("passes dryRun false only when a live provider account exists and the caller asked for it", async () => {
        const em = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })],
                [ServiceEntity, serviceRow()],
                [RenewalRequestEntity, null],
                [CustomerEntity, customerRow()],
            ],
            update: [RenewalRequestEntity, {}],
            exists: [ProviderAccountEntity, true],
        })
        const { renewals, plugin } = await build(em)
        plugin.renew.mockResolvedValue({
            plugin: "manual",
            state: "pending_person",
            providerRef: null,
            newExpiresOn: null,
            dryRun: false,
        })
        await expect(renewals.execute(INPUT)).resolves.toEqual(
            expect.objectContaining({ state: "pending_person", plugin: "manual", dryRun: false }),
        )
        expect(plugin.renew).toHaveBeenCalledWith(expect.objectContaining({ dryRun: false }))
    })
})

describe("RenewalsService execute (service.renewal.create)", () => {
    it("answers a recorded execution on a repeat of its key without asking again", async () => {
        const done = renewalRow({
            state: "pending_person",
            executeKey: "renew-1",
            executeHash: HASH,
            plugin: "manual",
        })
        const em = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, done],
                [ServiceEntity, serviceRow()],
                [CustomerEntity, customerRow()],
            ],
        })
        const { renewals, plugin } = await build(em)
        await expect(renewals.execute(INPUT)).resolves.toEqual(expect.objectContaining({ state: "pending_person" }))
        expect(plugin.renew).not.toHaveBeenCalled()
    })
})

describe("RenewalsService execute (service.renewal.create)", () => {
    it("refuses another service's request and a key already used for another request", async () => {
        const mismatch = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, renewalRow({ state: "paid" })],
                [ServiceEntity, serviceRow({ code: "SYN-TM" })],
            ],
        })
        await expect((await build(mismatch)).renewals.execute(INPUT)).rejects.toEqual(
            refused(CrmErrorCode.RenewalServiceMismatch, { serviceCode: "SYN-TM" }),
        )
        const reused = mockEntityManager({
            findOne: [
                [RenewalRequestEntity, renewalRow({ state: "paid" })],
                [ServiceEntity, serviceRow()],
                [RenewalRequestEntity, renewalRow({ id: uuid(52) })],
            ],
        })
        await expect((await build(reused)).renewals.execute(INPUT)).rejects.toEqual(
            refused(CrmErrorCode.IdempotencyKeyReused),
        )
    })
})

describe("RenewalsService recordOutcome", () => {
    it("records renewed and moves the service's end date as confirmed", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "pending_person" })], ...viewStubs],
            update: [
                [RenewalRequestEntity, {}],
                [ServiceEntity, {}],
            ],
        })
        const { renewals } = await build(em)
        await expect(
            renewals.recordOutcome({
                workspaceId: WS,
                id: uuid(51),
                outcome: "renewed",
                newExpiresOn: "2027-12-01",
                confirmedBy: "Synthetic Staff",
                note: null,
            }),
        ).resolves.toEqual(
            expect.objectContaining({
                state: "renewed",
                newExpiresOn: "2027-12-01",
                confirmedBy: "Synthetic Staff",
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
    it("records failed without touching the service, answers a repeat, and refuses a request not waiting for a person", async () => {
        const em = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "pending_person" })], ...viewStubs],
            update: [RenewalRequestEntity, {}],
        })
        const { renewals } = await build(em)
        await expect(
            renewals.recordOutcome({
                workspaceId: WS,
                id: uuid(51),
                outcome: "failed",
                newExpiresOn: null,
                confirmedBy: "S",
                note: "panel refused",
            }),
        ).resolves.toEqual(expect.objectContaining({ state: "failed" }))
        expect(em.update).toHaveBeenCalledTimes(1)
        const repeat = mockEntityManager({
            findOne: [[RenewalRequestEntity, renewalRow({ state: "failed", confirmedBy: "S" })], ...viewStubs],
        })
        await expect(
            (await build(repeat)).renewals.recordOutcome({
                workspaceId: WS,
                id: uuid(51),
                outcome: "failed",
                newExpiresOn: null,
                confirmedBy: "S",
                note: null,
            }),
        ).resolves.toEqual(expect.objectContaining({ state: "failed" }))
        const paid = mockEntityManager({ findOne: [RenewalRequestEntity, renewalRow({ state: "paid" })] })
        await expect(
            (await build(paid)).renewals.recordOutcome({
                workspaceId: WS,
                id: uuid(51),
                outcome: "renewed",
                newExpiresOn: null,
                confirmedBy: "S",
                note: null,
            }),
        ).rejects.toEqual(refused(CrmErrorCode.RenewalStateRefused, { state: "paid" }))
    })
})

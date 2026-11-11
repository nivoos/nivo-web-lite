import { Test } from "@nestjs/testing"
import { FakeClock, type MockEntityManager, fakeIds, fakeTransaction, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { IDS } from "@modules/platform/ids"
import { WS, customerRow, uuid } from "@tests/fixtures/builders/crm.builder"
import {
    cursorOf,
    followUpRow,
    priceSheetRow,
    purchaseRow,
    quotedPurchaseRow,
} from "@tests/fixtures/builders/purchase.builder"
import { NO_STRAYS, PURCHASE_OPERATIONS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CRM_PRICE_TABLE } from "./crm.decorators"
import { CrmErrorCode } from "./errors/crm.error"
import {
    ContractEntity,
    CustomerEntity,
    ProjectEntity,
    PurchaseEntity,
    PurchaseFollowupEntity,
    ReceivableEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"
import { PurchasesService } from "./purchases.service"

const NOW = "2026-11-12T03:00:00.000Z"
const ID = uuid(121)
const PAGE = { limit: 20, cursor: null }

/** A synthetic price sheet (not the owner's): hosting for 12 months, a website build in two instalments, a placeholder renewal. */
const PRICE_SHEET = [
    priceSheetRow(),
    priceSheetRow({
        priceCode: "new-website",
        name: "Website build",
        serviceClass: "website",
        termMonths: null,
        setupVnd: 9_000_000,
        netVnd: 0,
        instalmentPercents: [40, 60],
    }),
    priceSheetRow({ priceCode: "renewal-hosting-12", kind: "renewal", priceSource: "placeholder" }),
]

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const moduleRef = await Test.createTestingModule({
        providers: [
            PurchasesService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
            { provide: CRM_PRICE_TABLE, useValue: PRICE_SHEET },
        ],
    }).compile()
    return moduleRef.get(PurchasesService)
}

const refused = (code: CrmErrorCode, params?: Record<string, unknown>): unknown =>
    expect.objectContaining(params === undefined ? { code } : { code, params })

const SAID = { contactName: null, phone: null, email: null, domain: null, customerCode: null } as const
const ENQUIRY = { workspaceId: WS, channel: "zalo", sourceRef: "conv-9", need: "A shop website", ...SAID } as const

describe("PurchasesService: the price table", () => {
    it("lists the rows of one kind by price code, after the page cursor", async () => {
        const purchases = await build(mockEntityManager())
        const page = await purchases.listPrices({ workspaceId: WS, kind: "new", page: { limit: 1, cursor: null } })
        const next = await purchases.listPrices({
            workspaceId: WS,
            kind: null,
            page: { limit: 5, cursor: page.nextCursor },
        })
        expect([page.items.map((row) => row.priceCode), next.items.map((row) => row.priceCode)]).toEqual([
            ["new-hosting-12"],
            ["new-website", "renewal-hosting-12"],
        ])
    })
})

describe("PurchasesService.create", () => {
    it("answers the open purchase of the same channel and source instead of opening another", async () => {
        const em = mockEntityManager({
            findOne: [PurchaseEntity, purchaseRow()],
            find: [PurchaseFollowupEntity, [followUpRow()]],
        })
        const view = await (await build(em)).create(ENQUIRY)
        expect([view.id, view.followUps.length, em.insert.mock.calls.length]).toEqual([ID, 1, 0])
    })

    it("opens a purchase in state enquiry with its own code", async () => {
        const em = mockEntityManager({ findOne: [PurchaseEntity, null], insert: [PurchaseEntity, {}] })
        const view = await (await build(em)).create(ENQUIRY)
        expect([view.state, view.code, view.quote]).toEqual([
            "enquiry",
            expect.stringMatching(/^MUA-[A-Z0-9]{8}$/u),
            null,
        ])
    })
})

describe("PurchasesService.update and get", () => {
    it("changes what was said, marks an enquiry lost with its note, and refuses a paid purchase", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, purchaseRow({ state: "paid" })],
            ],
            update: [PurchaseEntity, {}],
            find: [PurchaseFollowupEntity, []],
        })
        const purchases = await build(em)
        const edit = { workspaceId: WS, id: ID, ...SAID, need: null, state: "lost", note: "chose another" } as const
        await expect(purchases.update(edit)).resolves.toEqual(
            expect.objectContaining({ state: "lost", note: "chose another" }),
        )
        await expect(purchases.update(edit)).rejects.toEqual(
            refused(CrmErrorCode.PurchaseStateRefused, { state: "paid" }),
        )
    })

    it("reads one purchase and refuses an unknown one", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, null],
            ],
            find: [PurchaseFollowupEntity, []],
        })
        const purchases = await build(em)
        await expect(purchases.get({ workspaceId: WS, id: ID })).resolves.toEqual(expect.objectContaining({ id: ID }))
        await expect(purchases.get({ workspaceId: WS, id: ID })).rejects.toEqual(refused(CrmErrorCode.PurchaseNotFound))
    })
})

describe("PurchasesService.listOpen", () => {
    it("pages the open purchases with their follow-up facts, filtered by state and source", async () => {
        const em = mockEntityManager({
            find: [
                [PurchaseEntity, [purchaseRow(), purchaseRow({ id: uuid(122) })]],
                [
                    PurchaseFollowupEntity,
                    [followUpRow(), followUpRow({ id: uuid(132), day: "2026-11-10", outcome: "answered" })],
                ],
            ],
        })
        const page = await (
            await build(em)
        ).listOpen({
            workspaceId: WS,
            state: "enquiry",
            sourceRef: "conv-9",
            page: { limit: 1, cursor: cursorOf("purchase.open.list", [uuid(120)]) },
        })
        expect(page.items).toEqual([
            expect.objectContaining({
                id: ID,
                lastFollowUpOn: "2026-11-11",
                followUpCount: 2,
                openFollowUp: true,
                reachable: true,
            }),
        ])
        expect(page.nextCursor).not.toBeNull()
        const all = await (
            await build(
                mockEntityManager({
                    find: [
                        [PurchaseEntity, []],
                        [PurchaseFollowupEntity, []],
                    ],
                }),
            )
        ).listOpen({
            workspaceId: WS,
            state: null,
            sourceRef: null,
            page: PAGE,
        })
        expect(all).toEqual({ items: [], nextCursor: null })
    })
})

describe("PurchasesService.quote", () => {
    it("prices the items from the table, totals with VAT and moves the purchase to quoted", async () => {
        const em = mockEntityManager({
            findOne: [PurchaseEntity, purchaseRow()],
            update: [PurchaseEntity, {}],
            find: [PurchaseFollowupEntity, []],
        })
        const view = await (
            await build(em)
        ).quote({
            workspaceId: WS,
            id: ID,
            items: [
                { priceCode: "new-website", termMonths: null, quantity: null },
                { priceCode: "new-hosting-12", termMonths: 12, quantity: 2 },
            ],
        })
        expect([
            view.state,
            view.quote?.netVnd,
            view.quote?.vatVnd,
            view.quote?.totalVnd,
            view.quote?.validUntil,
        ]).toEqual(["quoted", 11_000_000, 1_100_000, 12_100_000, "2026-11-26"])
    })

    it("refuses a placeholder row, an unknown row and another term", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, purchaseRow()],
            ],
        })
        const purchases = await build(em)
        const quote = (priceCode: string, termMonths: number | null) =>
            purchases.quote({ workspaceId: WS, id: ID, items: [{ priceCode, termMonths, quantity: 1 }] })
        await expect(quote("renewal-hosting-12", null)).rejects.toEqual(
            refused(CrmErrorCode.PricePlaceholder, { priceCode: "renewal-hosting-12" }),
        )
        await expect(quote("nope", null)).rejects.toEqual(refused(CrmErrorCode.PriceNotFound, { priceCode: "nope" }))
        await expect(quote("new-hosting-12", 24)).rejects.toEqual(
            refused(CrmErrorCode.PriceNotFound, { priceCode: "new-hosting-12" }),
        )
    })
})

describe("PurchasesService.followUp", () => {
    it("records today's follow-up keyed by purchase and day, and refuses a closed purchase", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, purchaseRow({ state: "delivered" })],
            ],
            upsert: [PurchaseFollowupEntity, {}],
            find: [PurchaseFollowupEntity, [followUpRow({ day: "2026-11-12" })]],
        })
        const purchases = await build(em)
        const view = await purchases.followUp({
            workspaceId: WS,
            id: ID,
            channel: "zalo",
            outcome: "no_answer",
            messageRef: "m-1",
        })
        expect([view.followUps.map((f) => f.day), em.upsert.mock.calls[0]?.[2]]).toEqual([
            ["2026-11-12"],
            ["workspaceId", "purchaseId", "day"],
        ])
        await expect(
            purchases.followUp({ workspaceId: WS, id: ID, channel: "zalo", outcome: "sent", messageRef: null }),
        ).rejects.toEqual(refused(CrmErrorCode.PurchaseStateRefused, { state: "delivered" }))
    })
})

describe("PurchasesService.createCustomer", () => {
    it("opens a customer with a new code for the purchase, and refuses one the books already hold with its code", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow()],
                [CustomerEntity, null],
                [PurchaseEntity, purchaseRow()],
                [CustomerEntity, customerRow()],
                [PurchaseEntity, purchaseRow()],
            ],
            insert: [
                [CustomerEntity, {}],
                [CustomerEntity, {}],
            ],
            update: [
                [PurchaseEntity, {}],
                [PurchaseEntity, {}],
            ],
        })
        const purchases = await build(em)
        const input = {
            workspaceId: WS,
            purchaseId: ID,
            kind: "company",
            name: "Synthetic Buyer Co",
            taxId: "0100000009",
            address: null,
            phone: "0900000009",
            email: "b@synthetic.example",
        } as const
        const created = await purchases.createCustomer(input)
        expect(created.customerCode).toMatch(/^KH-[A-Z0-9]{8}$/u)
        await expect(purchases.createCustomer(input)).rejects.toEqual(
            refused(CrmErrorCode.CustomerExists, { customerCode: "SYN-001" }),
        )
        const anonymous = await purchases.createCustomer({ ...input, taxId: null, phone: null, email: null })
        expect(anonymous.customerCode).toMatch(/^KH-/u)
    })
})

describe("PurchasesService.accept", () => {
    it("shows, dry, what the acceptance would open and writes nothing", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, quotedPurchaseRow()],
                [CustomerEntity, customerRow()],
            ],
            find: [PurchaseFollowupEntity, []],
        })
        const accepted = await (
            await build(em)
        ).accept({ workspaceId: WS, id: ID, customerCode: "SYN-001", dryRun: true })
        expect(accepted).toEqual(
            expect.objectContaining({
                dryRun: true,
                projectCode: "P-ABCDEFGH",
                contractNo: "HD-ABCDEFGH",
                serviceCodes: ["MUA-ABCDEFGH-1"],
                firstInstalmentVnd: 4_400_000,
            }),
        )
        expect([accepted.purchase.state, em.insert.mock.calls.length]).toEqual(["quoted", 0])
    })

    it("opens the project, the pending service, the contract record and one receivable, and awaits the payment", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, quotedPurchaseRow()],
                [CustomerEntity, customerRow()],
            ],
            insert: [
                [ProjectEntity, {}],
                [ServiceEntity, {}],
                [ContractEntity, {}],
                [ReceivableEntity, {}],
            ],
            update: [PurchaseEntity, {}],
            find: [PurchaseFollowupEntity, []],
        })
        const accepted = await (
            await build(em)
        ).accept({ workspaceId: WS, id: ID, customerCode: "SYN-001", dryRun: false })
        expect([accepted.purchase.state, accepted.purchase.customerCode, accepted.paymentCode]).toEqual([
            "awaiting_payment",
            "SYN-001",
            expect.stringMatching(/^MH/u),
        ])
        expect(em.insert.mock.calls.map((call) => call[0])).toEqual([
            ProjectEntity,
            ServiceEntity,
            ContractEntity,
            ReceivableEntity,
        ])
        expect(em.insert.mock.calls[1]?.[1]).toEqual([
            expect.objectContaining({ code: "MUA-ABCDEFGH-1", status: "pending", serviceClass: "hosting" }),
        ])
    })
})

describe("PurchasesService.accept: other quotes and refusals", () => {
    it("opens no project for a quote without a website build, and refuses an expired quote, an unknown customer and an enquiry", async () => {
        const hostingOnly = purchaseRow({ ...quotedPurchaseRow(), lines: quotedPurchaseRow().lines?.slice(1) ?? [] })
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, hostingOnly],
                [CustomerEntity, customerRow()],
                [PurchaseEntity, purchaseRow({ ...quotedPurchaseRow(), validUntil: "2026-11-01" })],
                [PurchaseEntity, quotedPurchaseRow()],
                [CustomerEntity, null],
                [PurchaseEntity, purchaseRow()],
            ],
            find: [PurchaseFollowupEntity, []],
        })
        const purchases = await build(em)
        const accept = () => purchases.accept({ workspaceId: WS, id: ID, customerCode: "SYN-001", dryRun: true })
        await expect(accept()).resolves.toEqual(
            expect.objectContaining({ projectCode: null, firstInstalmentVnd: 11_000_000 }),
        )
        await expect(accept()).rejects.toEqual(refused(CrmErrorCode.QuoteExpired, { validUntil: "2026-11-01" }))
        await expect(accept()).rejects.toEqual(refused(CrmErrorCode.CustomerNotFound))
        await expect(accept()).rejects.toEqual(refused(CrmErrorCode.PurchaseStateRefused, { state: "enquiry" }))
    })
})

describe("PurchasesService.recordPayment", () => {
    it("marks an accepted purchase paid once, answers a repeat, and refuses a bank row another request used", async () => {
        const awaiting = purchaseRow({ state: "awaiting_payment", paymentCode: "MHABCDEFGH" })
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, awaiting],
                [PurchaseEntity, purchaseRow({ state: "paid", transactionRef: "bank-1" })],
                [PurchaseEntity, awaiting],
                [PurchaseEntity, purchaseRow()],
            ],
            exists: [
                [PurchaseEntity, false],
                [RenewalRequestEntity, false],
                [PurchaseEntity, false],
                [RenewalRequestEntity, true],
            ],
            update: [PurchaseEntity, {}],
            find: [PurchaseFollowupEntity, []],
        })
        const purchases = await build(em)
        const pay = (transactionRef: string) => purchases.recordPayment({ workspaceId: WS, id: ID, transactionRef })
        await expect(pay("bank-1")).resolves.toEqual(
            expect.objectContaining({ state: "paid", transactionRef: "bank-1", paidAt: NOW }),
        )
        await expect(pay("bank-1")).resolves.toEqual(expect.objectContaining({ state: "paid" }))
        await expect(pay("bank-2")).rejects.toEqual(
            refused(CrmErrorCode.TransactionRefUsed, { transactionRef: "bank-2" }),
        )
        await expect(pay("bank-3")).rejects.toEqual(refused(CrmErrorCode.PurchaseStateRefused, { state: "enquiry" }))
    })
})

describe("PurchasesService.recordOutcome", () => {
    it("delivers a paid purchase, cancels an open one, and refuses to deliver an enquiry", async () => {
        const em = mockEntityManager({
            findOne: [
                [PurchaseEntity, purchaseRow({ state: "paid" })],
                [PurchaseEntity, purchaseRow()],
                [PurchaseEntity, purchaseRow()],
            ],
            update: [
                [PurchaseEntity, {}],
                [PurchaseEntity, {}],
            ],
            find: [PurchaseFollowupEntity, []],
        })
        const purchases = await build(em)
        const outcome = (value: "delivered" | "cancelled") =>
            purchases.recordOutcome({
                workspaceId: WS,
                id: ID,
                outcome: value,
                confirmedBy: "Synthetic Staff",
                note: null,
            })
        await expect(outcome("delivered")).resolves.toEqual(expect.objectContaining({ state: "delivered" }))
        await expect(outcome("cancelled")).resolves.toEqual(expect.objectContaining({ state: "cancelled" }))
        await expect(outcome("delivered")).rejects.toEqual(
            refused(CrmErrorCode.PurchaseStateRefused, { state: "enquiry" }),
        )
    })
})

describe("PurchasesService.listContracts", () => {
    it("pages the register of one customer and kind, and refuses an unknown customer", async () => {
        const contract = Object.assign(new ContractEntity(), { contractNo: "HD-1", kind: "sale", customerId: uuid(1) })
        const em = mockEntityManager({
            findOne: [
                [CustomerEntity, customerRow()],
                [CustomerEntity, null],
            ],
            find: [
                [ContractEntity, [contract]],
                [ContractEntity, []],
            ],
        })
        const purchases = await build(em)
        const page = await purchases.listContracts({
            workspaceId: WS,
            kind: "sale",
            customerCode: "SYN-001",
            page: PAGE,
        })
        const after = await purchases.listContracts({
            workspaceId: WS,
            kind: null,
            customerCode: null,
            page: { limit: 1, cursor: cursorOf("contract.list", ["HD-0"]) },
        })
        expect([page.items.map((item) => item.contractNo), after.items]).toEqual([["HD-1"], []])
        await expect(
            purchases.listContracts({ workspaceId: WS, kind: null, customerCode: "NOPE", page: PAGE }),
        ).rejects.toEqual(refused(CrmErrorCode.CustomerNotFound))
    })
})

describe("PurchasesService: one credential, one workspace", () => {
    it.each(PURCHASE_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call(await build(em), ws))).toEqual(NO_STRAYS)
    })
})

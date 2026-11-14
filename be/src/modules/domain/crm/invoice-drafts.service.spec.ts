import { Test } from "@nestjs/testing"
import { type MockEntityManager, fakeIds, fakeTransaction, mock, mockEntityManager } from "@starci/jest-preset"
import { IDS } from "@modules/platform/ids"
import { MESSAGE_CATALOG, type MessageCatalog } from "@modules/platform/i18n"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { isRecord } from "@modules/platform/primitives"
import { WS, customerRow, invoiceDraftRow, renewalRow, serviceRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { paidPurchaseRow, purchaseRow, unpricedPaidPurchaseRow } from "@tests/fixtures/builders/purchase.builder"
import { INVOICE_DRAFT_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmErrorCode } from "./errors/crm.error"
import { InvoiceDraftsService } from "./invoice-drafts.service"
import {
    CustomerEntity,
    InvoiceDraftEntity,
    InvoiceEntity,
    PurchaseEntity,
    RenewalRequestEntity,
    ServiceEntity,
} from "./persistence/entities"

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const catalog = mock<MessageCatalog>()
    catalog.get.mockImplementation(
        (key: string, params: Readonly<Record<string, unknown>>) => `${key}:${JSON.stringify(params)}`,
    )
    const moduleRef = await Test.createTestingModule({
        providers: [
            InvoiceDraftsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: MESSAGE_CATALOG, useValue: catalog },
            { provide: IDS, useValue: fakeIds() },
        ],
    }).compile()
    return moduleRef.get(InvoiceDraftsService)
}

const INPUT = { workspaceId: WS, renewalId: uuid(51), purchaseId: null }

describe("InvoiceDraftsService", () => {
    it("drafts a paid renewal's invoice with the renewal's own amounts", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })],
                [ServiceEntity, serviceRow()],
                [CustomerEntity, customerRow()],
            ],
            insert: [InvoiceDraftEntity, {}],
        })
        await expect((await build(em)).create(INPUT)).resolves.toEqual({
            id: uuid(1),
            renewalId: uuid(51),
            purchaseId: null,
            customerCode: "SYN-001",
            lines: [
                {
                    description:
                        'crm.invoice-draft.renewal-line:{"serviceClass":"crm.service-class.hosting:{}","serviceCode":"SYN-HOST","termMonths":12}',
                    quantity: 1,
                    unitPriceVnd: 1_200_000,
                    amountVnd: 1_200_000,
                },
            ],
            netVnd: 1_200_000,
            vatRatePercent: 10,
            vatVnd: 120_000,
            totalVnd: 1_320_000,
            state: "draft",
            priceSource: "placeholder",
            invoiceNo: null,
            providerRef: null,
            issuedOn: null,
        })
    })
})

describe("InvoiceDraftsService: replays and refusals", () => {
    it("answers the existing draft of the renewal", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, invoiceDraftRow()],
                [CustomerEntity, customerRow()],
            ],
        })
        await expect((await build(em)).create(INPUT)).resolves.toEqual(expect.objectContaining({ id: uuid(101) }))
    })

    it("refuses an unpaid or unknown renewal", async () => {
        const unpaid = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [RenewalRequestEntity, renewalRow()],
            ],
        })
        await expect((await build(unpaid)).create(INPUT)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.RenewalStateRefused, params: { state: "awaiting_payment" } }),
        )
        const unknown = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [RenewalRequestEntity, null],
            ],
        })
        await expect((await build(unknown)).create(INPUT)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.RenewalNotFound }),
        )
    })

    it("gets a draft and refuses an unknown one", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, invoiceDraftRow()],
                [CustomerEntity, customerRow()],
            ],
        })
        await expect((await build(em)).get({ workspaceId: WS, id: uuid(101) })).resolves.toEqual(
            expect.objectContaining({ totalVnd: 1_320_000 }),
        )
        const none = mockEntityManager({ findOne: [InvoiceDraftEntity, null] })
        await expect((await build(none)).get({ workspaceId: WS, id: uuid(9) })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceDraftNotFound }),
        )
    })
})

/** The e-invoice MISA issued for the draft, as the Accounting agent records it (owner ruling R57: the CRM issues nothing). */
const ISSUED = {
    workspaceId: WS,
    id: uuid(101),
    invoiceNo: "00000123",
    providerRef: "MISA-TX-1",
    issuedOn: "2026-11-14",
} as const

describe("InvoiceDraftsService.recordIssued", () => {
    it("records the issued e-invoice on its draft: number, provider reference and issue date", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, invoiceDraftRow()],
                [CustomerEntity, customerRow()],
            ],
            exists: [InvoiceDraftEntity, false],
            update: [InvoiceDraftEntity, {}],
        })
        await expect((await build(em)).recordIssued(ISSUED)).resolves.toEqual(
            expect.objectContaining({
                id: uuid(101),
                state: "issued",
                invoiceNo: "00000123",
                providerRef: "MISA-TX-1",
                issuedOn: "2026-11-14",
                totalVnd: 1_320_000,
            }),
        )
        expect(em.update).toHaveBeenCalledWith(
            InvoiceDraftEntity,
            { id: uuid(101), workspaceId: WS },
            { state: "issued", invoiceNo: "00000123", providerRef: "MISA-TX-1", issuedOn: "2026-11-14" },
        )
    })

    it("answers the stored draft for the same number, and refuses another number, a number in use and an unknown draft", async () => {
        const issued = invoiceDraftRow({
            state: "issued",
            invoiceNo: "00000123",
            providerRef: "MISA-TX-1",
            issuedOn: "2026-11-14",
        })
        const repeat = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, issued],
                [CustomerEntity, customerRow()],
            ],
        })
        await expect((await build(repeat)).recordIssued(ISSUED)).resolves.toEqual(
            expect.objectContaining({ state: "issued" }),
        )
        expect(repeat.update).not.toHaveBeenCalled()
        const other = mockEntityManager({ findOne: [InvoiceDraftEntity, issued] })
        await expect((await build(other)).recordIssued({ ...ISSUED, invoiceNo: "00000124" })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceAlreadyIssued, params: { invoiceNo: "00000123" } }),
        )
        const used = mockEntityManager({
            findOne: [InvoiceDraftEntity, invoiceDraftRow()],
            exists: [InvoiceDraftEntity, true],
        })
        await expect((await build(used)).recordIssued(ISSUED)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceNumberUsed }),
        )
        const none = mockEntityManager({ findOne: [InvoiceDraftEntity, null] })
        await expect((await build(none)).recordIssued(ISSUED)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceDraftNotFound }),
        )
    })
})

describe("InvoiceDraftsService: one credential, one workspace", () => {
    it.each(INVOICE_DRAFT_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call(await build(em), ws))).toEqual(NO_STRAYS)
    })
})

/** A synthetic VAT invoice of the workspace. */
const invoiceRow = (invoiceNo: string, customerCode: string | null): InvoiceEntity =>
    Object.assign(new InvoiceEntity(), {
        invoiceNo,
        customerCode,
        issuedOn: "2026-02-03",
        amountVnd: null,
        documentPath: null,
    })

describe("InvoiceDraftsService.listInvoices", () => {
    it("lists the workspace's VAT invoices by number with the customer code the source wrote, nullable amounts as stored", async () => {
        const em = mockEntityManager({
            find: [InvoiceEntity, [invoiceRow("00000001", "NOT-THERE"), invoiceRow("00000002", null)]],
        })

        const page = await (
            await build(em)
        ).listInvoices({
            workspaceId: WS,
            customerCode: null,
            issuedFrom: null,
            issuedTo: null,
            page: { limit: 1, cursor: null },
        })

        expect(page.items).toEqual([
            {
                invoiceNo: "00000001",
                issuedOn: "2026-02-03",
                amountVnd: null,
                hasDocument: false,
                customerCode: "NOT-THERE",
            },
        ])
        expect(page.nextCursor).not.toBeNull()
        expect(em.find.mock.calls[0]?.[1]).toEqual({ where: { workspaceId: WS }, order: { invoiceNo: "ASC" }, take: 2 })
    })

    it("filters by customer code and issue period, after the page cursor", async () => {
        const em = mockEntityManager({
            find: [
                [InvoiceEntity, [invoiceRow("00000002", "SYN-001"), invoiceRow("00000003", "SYN-001")]],
                [InvoiceEntity, []],
            ],
        })
        const drafts = await build(em)
        const first = await drafts.listInvoices({
            workspaceId: WS,
            customerCode: "SYN-001",
            issuedFrom: "2026-01-01",
            issuedTo: "2026-12-31",
            page: { limit: 1, cursor: null },
        })
        await drafts.listInvoices({
            workspaceId: WS,
            customerCode: null,
            issuedFrom: null,
            issuedTo: "2026-12-31",
            page: { limit: 1, cursor: first.nextCursor ?? "x" },
        })

        const options: unknown = em.find.mock.calls[0]?.[1]
        expect(JSON.stringify(options)).toContain("SYN-001")
        const later: unknown = em.find.mock.calls[1]?.[1]
        expect([JSON.stringify(later).includes("2026-12-31"), JSON.stringify(later).includes("00000002")]).toEqual([
            true,
            true,
        ])
        expect(first.items.map((item) => item.customerCode)).toEqual(["SYN-001"])
    })
})

describe("InvoiceDraftsService: a purchase", () => {
    it("drafts a paid purchase from its quote's lines and amounts", async () => {
        const paid = paidPurchaseRow()
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [PurchaseEntity, paid],
                [CustomerEntity, customerRow()],
            ],
            insert: [InvoiceDraftEntity, {}],
        })
        const draft = await (await build(em)).create({ workspaceId: WS, renewalId: null, purchaseId: paid.id })
        expect([draft.purchaseId, draft.renewalId, draft.lines.length, draft.totalVnd, draft.customerCode]).toEqual([
            paid.id,
            null,
            2,
            11_000_000,
            "SYN-001",
        ])
    })
})

describe("InvoiceDraftsService: a purchase, refusals and defaults", () => {
    it("refuses an unpaid, unknown or unpriced purchase and a request naming neither or both", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [PurchaseEntity, purchaseRow()],
                [InvoiceDraftEntity, null],
                [PurchaseEntity, null],
                [InvoiceDraftEntity, null],
                [PurchaseEntity, paidPurchaseRow({ totalVnd: null })],
            ],
        })
        const drafts = await build(em)
        const purchase = { workspaceId: WS, renewalId: null, purchaseId: uuid(121) }
        const codes = await Promise.all(
            [purchase, purchase, purchase].map((input) =>
                drafts.create(input).then(
                    () => null,
                    (error: unknown) => (isRecord(error) ? error["code"] : null),
                ),
            ),
        )
        expect(codes).toEqual([
            CrmErrorCode.PurchaseStateRefused,
            CrmErrorCode.PurchaseNotFound,
            CrmErrorCode.PurchaseStateRefused,
        ])
        const both = { workspaceId: WS, renewalId: uuid(51), purchaseId: uuid(121) }
        await expect(drafts.create(both)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceDraftSubjectInvalid }),
        )
        await expect(drafts.create({ ...both, renewalId: null, purchaseId: null })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.InvoiceDraftSubjectInvalid }),
        )
    })

    it("refuses a renewal whose service is gone", async () => {
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [RenewalRequestEntity, renewalRow({ state: "paid", transactionRef: "BANK-9" })],
                [ServiceEntity, null],
            ],
        })
        await expect((await build(em)).create(INPUT)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ServiceNotFound }),
        )
    })

    it("drafts with the placeholder VAT and source when the quote kept none", async () => {
        const delivered = unpricedPaidPurchaseRow()
        const em = mockEntityManager({
            findOne: [
                [InvoiceDraftEntity, null],
                [PurchaseEntity, delivered],
                [CustomerEntity, null],
            ],
            insert: [InvoiceDraftEntity, {}],
        })
        await expect(
            (await build(em)).create({ workspaceId: WS, renewalId: null, purchaseId: delivered.id }),
        ).resolves.toEqual(
            expect.objectContaining({ vatRatePercent: 10, priceSource: "placeholder", customerCode: "" }),
        )
    })
})

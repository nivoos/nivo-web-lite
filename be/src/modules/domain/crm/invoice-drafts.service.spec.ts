import { Test } from "@nestjs/testing"
import { type MockEntityManager, fakeIds, fakeTransaction, mock, mockEntityManager } from "@starci/jest-preset"
import { IDS } from "@modules/platform/ids"
import { MESSAGE_CATALOG, type MessageCatalog } from "@modules/platform/i18n"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { WS, customerRow, invoiceDraftRow, renewalRow, serviceRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { INVOICE_DRAFT_OPERATIONS, NO_STRAYS, straysOf } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmErrorCode } from "./errors/crm.error"
import { InvoiceDraftsService } from "./invoice-drafts.service"
import { CustomerEntity, InvoiceDraftEntity, RenewalRequestEntity, ServiceEntity } from "./persistence/entities"

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

const INPUT = { workspaceId: WS, renewalId: uuid(51) }

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
        })
    })

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

describe("InvoiceDraftsService: one credential, one workspace", () => {
    it.each(INVOICE_DRAFT_OPERATIONS)("%s names only the calling credential's workspace", async (id, call) => {
        expect(await straysOf(id, async (em, ws) => call(await build(em), ws))).toEqual(NO_STRAYS)
    })
})

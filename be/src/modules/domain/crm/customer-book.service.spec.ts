import { Test } from "@nestjs/testing"
import { type MockEntityManager, fakeIds, fakeTransaction, mock, mockEntityManager } from "@starci/jest-preset"
import { IDS } from "@modules/platform/ids"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { decodeCursor, pageOf } from "@modules/platform/pagination"
import {
    WS,
    contactRow,
    customerRow,
    payableRow,
    receivableRow,
    serviceRow,
    uuid,
    websiteRow,
} from "@tests/fixtures/builders/crm.builder"
import { CollectionsService } from "./collections.service"
import { CustomerBookService } from "./customer-book.service"
import { CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import type { ReceivableView } from "./customer.contracts"

const build = async (em: MockEntityManager) => {
    fakeTransaction(em)
    const collections = mock<CollectionsService>()
    const moduleRef = await Test.createTestingModule({
        providers: [
            CustomerBookService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: IDS, useValue: fakeIds() },
            { provide: CollectionsService, useValue: collections },
        ],
    }).compile()
    return { book: moduleRef.get(CustomerBookService), collections }
}

const PAGE = { limit: 20, cursor: null }

describe("CustomerBookService", () => {
    it("gets a customer with its domains and contacts; a linked contact makes it reachable", async () => {
        const em = mockEntityManager({
            findOne: [CustomerEntity, customerRow({ reachable: false, email: null })],
            find: [
                [WebsiteEntity, [websiteRow()]],
                [ContactEntity, [contactRow()]],
            ],
        })
        await expect((await build(em)).book.get({ workspaceId: WS, code: "SYN-001" })).resolves.toEqual(
            expect.objectContaining({
                code: "SYN-001",
                reachable: true,
                domains: ["synthetic.example"],
                contacts: [
                    {
                        name: "Synthetic Person",
                        preferredChannel: "zalo",
                        phone: null,
                        email: null,
                        zaloId: "zalo-synthetic-1",
                    },
                ],
            }),
        )
    })
})

describe("CustomerBookService", () => {
    it("refuses an unknown customer on every customer read", async () => {
        const { book } = await build(mockEntityManager({ findOne: [CustomerEntity, null] }))
        const key = { workspaceId: WS, code: "NOPE" }
        for (const read of [
            book.get(key),
            book.balance(key),
            book.listServices({ ...key, page: PAGE }),
            book.listContracts({ ...key, page: PAGE }),
        ]) {
            await expect(read).rejects.toEqual(expect.objectContaining({ code: CrmErrorCode.CustomerNotFound }))
        }
    })
})

describe("CustomerBookService", () => {
    it("finds customers by any field or a matching domain, paged by code", async () => {
        const em = mockEntityManager({
            find: [
                [WebsiteEntity, [websiteRow()]],
                [CustomerEntity, [customerRow(), customerRow({ id: uuid(2), code: "SYN-002" })]],
                [ContactEntity, []],
            ],
        })
        const { book } = await build(em)
        const page = await book.search({ workspaceId: WS, q: "  synth  ", page: { limit: 1, cursor: null } })
        expect(page.items).toEqual([expect.objectContaining({ code: "SYN-001", reachable: true })])
        expect(decodeCursor("customer.find", page.nextCursor, 1)).toEqual(["SYN-001"])
        expect(
            em.find.mock.calls.filter(([entity]) => entity === CustomerEntity).map(([, options]) => options?.take),
        ).toEqual([2])
        expect(
            em.find.mock.calls
                .filter(([entity]) => entity === CustomerEntity)
                .map(([, options]) => options?.where)
                .flat(),
        ).toHaveLength(6)
    })
})

describe("CustomerBookService", () => {
    it("pages from a cursor without the domain branch when no domain matches", async () => {
        const em = mockEntityManager({
            find: [
                [WebsiteEntity, []],
                [CustomerEntity, []],
            ],
        })
        const { book } = await build(em)
        await expect(
            book.search({
                workspaceId: WS,
                q: "x",
                page: {
                    limit: 20,
                    cursor: pageOf("customer.find", [["SYN-001"], []], 1, (keys: ReadonlyArray<string>) => keys, [])
                        .nextCursor,
                },
            }),
        ).resolves.toEqual({ items: [], nextCursor: null })
        expect(
            em.find.mock.calls
                .filter(([entity]) => entity === CustomerEntity)
                .map(([, options]) => options?.where)
                .flat(),
        ).toHaveLength(5)
    })
})

describe("CustomerBookService", () => {
    it("lists a customer's services with their domains, and its contracts, invoices and documents", async () => {
        const em = mockEntityManager({
            findOne: [CustomerEntity, customerRow()],
            find: [
                [
                    ServiceEntity,
                    [serviceRow(), serviceRow({ id: uuid(32), code: "SYN-SSL", websiteId: null, serviceClass: "ssl" })],
                ],
                [WebsiteEntity, [websiteRow()]],
                [ContractEntity, []],
                [InvoiceEntity, []],
                [DocumentEntity, []],
            ],
        })
        const { book } = await build(em)
        const services = await book.listServices({ workspaceId: WS, code: "SYN-001", page: PAGE })
        expect(services.items.map((service) => [service.code, service.domain, service.customerCode])).toEqual([
            ["SYN-HOST", "synthetic.example", "SYN-001"],
            ["SYN-SSL", null, "SYN-001"],
        ])
        const input = { workspaceId: WS, code: "SYN-001", page: PAGE }
        const empty = { items: [], nextCursor: null }
        await expect(book.listContracts(input)).resolves.toEqual(empty)
        await expect(book.listInvoices(input)).resolves.toEqual(empty)
        await expect(book.listDocuments(input)).resolves.toEqual(empty)
    })
})

describe("CustomerBookService", () => {
    it("gives the TK131 balance and the open receivables side by side, never summed together", async () => {
        const em = mockEntityManager({
            findOne: [
                [CustomerEntity, customerRow()],
                [LedgerBalanceEntity, payableRow({ account: "131", closingDebitVnd: 900_000, closingCreditVnd: 0 })],
            ],
            find: [ReceivableEntity, [receivableRow()]],
        })
        const { book, collections } = await build(em)
        const view: ReceivableView = {
            projectCode: "SYN-WEB",
            customerCode: "SYN-001",
            contractRef: null,
            totalVnd: 10_000_000,
            collectedVnd: 4_000_000,
            remainingVnd: 6_000_000,
            dueOn: "2026-10-01",
            projectState: null,
            lastNoticeOn: null,
            noticeCount: 0,
            paymentCount: 0,
        }
        collections.receivableViews.mockResolvedValue(new Map([[uuid(61), view]]))
        await expect(book.balance({ workspaceId: WS, code: "SYN-001" })).resolves.toEqual({
            customerCode: "SYN-001",
            ledger131: {
                openingDebitVnd: 0,
                openingCreditVnd: 0,
                debitVnd: 0,
                creditVnd: 500_000,
                closingDebitVnd: 900_000,
                closingCreditVnd: 0,
            },
            openReceivables: [view],
            openRemainingVnd: 6_000_000,
        })
    })
})

describe("CustomerBookService linkContact", () => {
    it("creates a contact named after the customer when no name is given", async () => {
        const em = mockEntityManager({
            findOne: [
                [CustomerEntity, customerRow()],
                [ContactEntity, null],
            ],
            insert: [ContactEntity, {}],
        })
        await expect(
            (await build(em)).book.linkContact({
                workspaceId: WS,
                code: "SYN-001",
                channel: "email",
                address: "a@example.test",
                name: null,
            }),
        ).resolves.toEqual({
            customerCode: "SYN-001",
            created: true,
            contact: {
                name: "Synthetic Co",
                preferredChannel: "email",
                phone: null,
                email: "a@example.test",
                zaloId: null,
            },
        })
    })
})

describe("CustomerBookService linkContact", () => {
    it("renames an address linked already and changes nothing else", async () => {
        const em = mockEntityManager({
            findOne: [
                [CustomerEntity, customerRow()],
                [ContactEntity, contactRow()],
            ],
            update: [ContactEntity, {}],
        })
        await expect(
            (await build(em)).book.linkContact({
                workspaceId: WS,
                code: "SYN-001",
                channel: "zalo",
                address: "zalo-synthetic-1",
                name: "New Name",
            }),
        ).resolves.toEqual({
            customerCode: "SYN-001",
            created: false,
            contact: {
                name: "New Name",
                preferredChannel: "zalo",
                phone: null,
                email: null,
                zaloId: "zalo-synthetic-1",
            },
        })
        expect(em.update).toHaveBeenCalledWith(ContactEntity, { id: uuid(11), workspaceId: WS }, { name: "New Name" })
        const same = mockEntityManager({
            findOne: [
                [CustomerEntity, customerRow()],
                [ContactEntity, contactRow()],
            ],
        })
        await expect(
            (await build(same)).book.linkContact({
                workspaceId: WS,
                code: "SYN-001",
                channel: "zalo",
                address: "zalo-synthetic-1",
                name: null,
            }),
        ).resolves.toEqual(expect.objectContaining({ created: false }))
    })
})

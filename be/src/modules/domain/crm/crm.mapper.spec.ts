import { Test } from "@nestjs/testing"
import {
    contactRow,
    customerRow,
    invoiceDraftRow,
    payableRow,
    renewalRow,
    serviceRow,
    ticketNoteRow,
    ticketRow,
    uuid,
} from "@tests/fixtures/builders/crm.builder"
import {
    isoOf,
    isoOrNull,
    likeOf,
    toContactView,
    toContractView,
    toCustomerSummary,
    toDocumentView,
    toInvoiceView,
    toLedgerView,
    toRenewalView,
    toServiceView,
    toTicketNoteView,
    toTicketSummary,
} from "./crm.mapper"
import { ContractEntity, DocumentEntity, InvoiceEntity } from "./persistence/entities"

const CRM_MAPPER: unique symbol = Symbol("crm-mapper")

/** The mapper under test, resolved through a testing module. */
interface CrmMapper {
    readonly isoOf: typeof isoOf
    readonly isoOrNull: typeof isoOrNull
    readonly likeOf: typeof likeOf
    readonly toContactView: typeof toContactView
    readonly toContractView: typeof toContractView
    readonly toCustomerSummary: typeof toCustomerSummary
    readonly toDocumentView: typeof toDocumentView
    readonly toInvoiceView: typeof toInvoiceView
    readonly toLedgerView: typeof toLedgerView
    readonly toRenewalView: typeof toRenewalView
    readonly toServiceView: typeof toServiceView
    readonly toTicketNoteView: typeof toTicketNoteView
    readonly toTicketSummary: typeof toTicketSummary
}

const mapper = async (): Promise<CrmMapper> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: CRM_MAPPER,
                useFactory: (): CrmMapper => ({
                    isoOf,
                    isoOrNull,
                    likeOf,
                    toContactView,
                    toContractView,
                    toCustomerSummary,
                    toDocumentView,
                    toInvoiceView,
                    toLedgerView,
                    toRenewalView,
                    toServiceView,
                    toTicketNoteView,
                    toTicketSummary,
                }),
            },
        ],
    }).compile()
    return moduleRef.get<CrmMapper>(CRM_MAPPER)
}

const AT = new Date("2026-11-12T03:00:00.000Z")

describe("crm mapper: instants and search text", () => {
    it("writes instants as ISO 8601 UTC and keeps null", async () => {
        const subject = await mapper()
        expect([subject.isoOf(AT), subject.isoOrNull(AT), subject.isoOrNull(null)]).toEqual([
            "2026-11-12T03:00:00.000Z",
            "2026-11-12T03:00:00.000Z",
            null,
        ])
    })

    it("escapes the LIKE wildcards and the escape character of a search text", async () => {
        expect((await mapper()).likeOf("a%b_c\\d")).toBe("%a\\%b\\_c\\\\d%")
    })
})

describe("crm mapper: customers and services", () => {
    it("shows a customer reachable when the books or a linked contact reach it", async () => {
        const subject = await mapper()
        const unreachable = customerRow({ reachable: false })
        expect([
            subject.toCustomerSummary(unreachable, false).reachable,
            subject.toCustomerSummary(unreachable, true).reachable,
        ]).toEqual([false, true])
        expect(subject.toContactView(contactRow())).toEqual({
            name: "Synthetic Person",
            preferredChannel: "zalo",
            phone: null,
            email: null,
            zaloId: "zalo-synthetic-1",
        })
    })

    it("maps a service with its customer code and domain", async () => {
        expect((await mapper()).toServiceView(serviceRow(), "SYN-001", "synthetic.example")).toEqual({
            code: "SYN-HOST",
            customerCode: "SYN-001",
            domain: "synthetic.example",
            serviceClass: "hosting",
            provider: "inet",
            status: "active",
            statusText: null,
            startsOn: "2025-12-01",
            expiresOn: "2026-12-01",
            expirySource: "provider",
        })
    })
})

describe("crm mapper: books", () => {
    it("maps a contract, an invoice with and without its document, a document and a TK131 balance", async () => {
        const subject = await mapper()
        const contract = Object.assign(new ContractEntity(), {
            contractNo: "HD-1",
            kind: "sale",
            partnerName: null,
            valueVnd: 5,
            signedOn: null,
            effectiveOn: null,
            expiresOn: null,
            autoRenew: null,
            warrantyUntil: null,
            statusText: null,
        })
        expect(subject.toContractView(contract)).toEqual({
            contractNo: "HD-1",
            kind: "sale",
            partnerName: null,
            valueVnd: 5,
            signedOn: null,
            effectiveOn: null,
            expiresOn: null,
            autoRenew: null,
            warrantyUntil: null,
            statusText: null,
        })
        const invoice = Object.assign(new InvoiceEntity(), {
            invoiceNo: "00000001",
            issuedOn: null,
            amountVnd: 10,
            documentPath: "x.pdf",
        })
        expect([
            subject.toInvoiceView(invoice).hasDocument,
            subject.toInvoiceView({ ...invoice, documentPath: null }).hasDocument,
        ]).toEqual([true, false])
        const document = Object.assign(new DocumentEntity(), {
            path: "a/b.pdf",
            kind: "invoice",
            invoiceNo: "00000001",
            contractNo: null,
            fileName: "b.pdf",
            sizeBytes: 3,
        })
        expect(subject.toDocumentView(document)).toEqual({
            path: "a/b.pdf",
            kind: "invoice",
            invoiceNo: "00000001",
            contractNo: null,
            fileName: "b.pdf",
            sizeBytes: 3,
        })
        expect(subject.toLedgerView(payableRow())).toEqual({
            openingDebitVnd: 0,
            openingCreditVnd: 0,
            debitVnd: 0,
            creditVnd: 500_000,
            closingDebitVnd: 0,
            closingCreditVnd: 500_000,
        })
    })
})

describe("crm mapper: renewals and tickets", () => {
    it("maps a renewal request with its instants", async () => {
        const view = (await mapper()).toRenewalView(
            renewalRow({ paidAt: AT, confirmedAt: null }),
            "SYN-HOST",
            "SYN-001",
        )
        expect([view.id, view.serviceCode, view.customerCode, view.paidAt, view.confirmedAt, view.totalVnd]).toEqual([
            uuid(51),
            "SYN-HOST",
            "SYN-001",
            "2026-11-12T03:00:00.000Z",
            null,
            1_320_000,
        ])
    })

    it("maps a ticket and a ticket note", async () => {
        const subject = await mapper()
        expect(subject.toTicketSummary(ticketRow(), "SYN-001", ["SYN-HOST"])).toEqual({
            id: uuid(91),
            customerCode: "SYN-001",
            serviceCodes: ["SYN-HOST"],
            kind: "fault",
            status: "open",
            channel: "zalo",
            sourceRef: "conv-1",
            subject: "Site answers 500",
            openedAt: "2026-11-10T02:00:00.000Z",
            closedAt: null,
        })
        expect(subject.toTicketNoteView(ticketNoteRow())).toEqual(
            expect.objectContaining({ body: "Checked the logs", statusTo: null }),
        )
        expect(invoiceDraftRow().totalVnd).toBe(1_320_000)
    })
})

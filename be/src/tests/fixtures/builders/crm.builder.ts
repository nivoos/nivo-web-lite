import { createHash } from "node:crypto"
import { builder } from "@starci/jest-preset"
import { crmEntities } from "@modules/domain/crm"

/** The entity classes of the crm tables, read from the capability's public entity list (its order is the restore order). */
const CustomerEntity: (typeof crmEntities)[0] = crmEntities[0]
const ContactEntity: (typeof crmEntities)[1] = crmEntities[1]
const WebsiteEntity: (typeof crmEntities)[2] = crmEntities[2]
const ServiceEntity: (typeof crmEntities)[3] = crmEntities[3]
const ServiceReminderEntity: (typeof crmEntities)[4] = crmEntities[4]
const RenewalRequestEntity: (typeof crmEntities)[7] = crmEntities[7]
const ReceivableEntity: (typeof crmEntities)[11] = crmEntities[11]
const LedgerBalanceEntity: (typeof crmEntities)[12] = crmEntities[12]
const ReceivableNoticeEntity: (typeof crmEntities)[17] = crmEntities[17]
const ReceivablePaymentEntity: (typeof crmEntities)[18] = crmEntities[18]
const PayableNoteEntity: (typeof crmEntities)[19] = crmEntities[19]
const TicketEntity: (typeof crmEntities)[20] = crmEntities[20]
const TicketNoteEntity: (typeof crmEntities)[21] = crmEntities[21]
const InvoiceDraftEntity: (typeof crmEntities)[22] = crmEntities[22]
const ServiceCredentialEntity: (typeof crmEntities)[23] = crmEntities[23]
const DocumentEntity: (typeof crmEntities)[13] = crmEntities[13]

/** A row of the Customer table. */
type CustomerEntity = InstanceType<typeof CustomerEntity>
/** A row of the Contact table. */
type ContactEntity = InstanceType<typeof ContactEntity>
/** A row of the Website table. */
type WebsiteEntity = InstanceType<typeof WebsiteEntity>
/** A row of the Service table. */
type ServiceEntity = InstanceType<typeof ServiceEntity>
/** A row of the ServiceReminder table. */
type ServiceReminderEntity = InstanceType<typeof ServiceReminderEntity>
/** A row of the RenewalRequest table. */
type RenewalRequestEntity = InstanceType<typeof RenewalRequestEntity>
/** A row of the Receivable table. */
type ReceivableEntity = InstanceType<typeof ReceivableEntity>
/** A row of the LedgerBalance table. */
type LedgerBalanceEntity = InstanceType<typeof LedgerBalanceEntity>
/** A row of the ReceivableNotice table. */
type ReceivableNoticeEntity = InstanceType<typeof ReceivableNoticeEntity>
/** A row of the ReceivablePayment table. */
type ReceivablePaymentEntity = InstanceType<typeof ReceivablePaymentEntity>
/** A row of the PayableNote table. */
type PayableNoteEntity = InstanceType<typeof PayableNoteEntity>
/** A row of the Ticket table. */
type TicketEntity = InstanceType<typeof TicketEntity>
/** A row of the TicketNote table. */
type TicketNoteEntity = InstanceType<typeof TicketNoteEntity>
/** A row of the InvoiceDraft table. */
type InvoiceDraftEntity = InstanceType<typeof InvoiceDraftEntity>
/** A row of the ServiceCredential table. */
type ServiceCredentialEntity = InstanceType<typeof ServiceCredentialEntity>
/** A row of the Document table. */
type DocumentEntity = InstanceType<typeof DocumentEntity>

/** The synthetic workspace of every CRM spec. */
export const WS = "6f1c2a9e-0000-4000-8000-00000000a001"

/** A synthetic uuid ending in `n`. */
export const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

/** The instant every synthetic row was created. */
export const CREATED: Date = new Date("2026-11-01T03:00:00.000Z")

const provenance = {
    sourceFile: "synthetic.xlsx",
    sourceSheet: "S",
    sourceRow: 1,
    sourceHash: "0".repeat(64),
    lastImportRunId: null,
}
const stamps = { createdAt: CREATED, updatedAt: CREATED }

/** A synthetic customer. */
export const customerRow: (
    overrides?: Partial<InstanceType<typeof CustomerEntity>>,
) => InstanceType<typeof CustomerEntity> = builder<InstanceType<typeof CustomerEntity>>(
    Object.assign(new CustomerEntity(), {
        id: uuid(1),
        workspaceId: WS,
        code: "SYN-001",
        kind: "company",
        name: "Synthetic Co",
        taxId: "0000000001",
        address: null,
        phone: null,
        email: "ops@example.test",
        folderPath: null,
        reachable: true,
        ...provenance,
        ...stamps,
    }),
)

/** A synthetic contact. */
export const contactRow: (
    overrides?: Partial<InstanceType<typeof ContactEntity>>,
) => InstanceType<typeof ContactEntity> = builder<InstanceType<typeof ContactEntity>>(
    Object.assign(new ContactEntity(), {
        id: uuid(11),
        workspaceId: WS,
        customerId: uuid(1),
        name: "Synthetic Person",
        phone: null,
        email: null,
        zaloId: "zalo-synthetic-1",
        preferredChannel: "zalo",
        ...stamps,
    }),
)

/** A synthetic website. */
export const websiteRow: (
    overrides?: Partial<InstanceType<typeof WebsiteEntity>>,
) => InstanceType<typeof WebsiteEntity> = builder<InstanceType<typeof WebsiteEntity>>(
    Object.assign(new WebsiteEntity(), {
        id: uuid(21),
        workspaceId: WS,
        domain: "synthetic.example",
        customerId: uuid(1),
        ...provenance,
        ...stamps,
    }),
)

/** A synthetic service. */
export const serviceRow: (
    overrides?: Partial<InstanceType<typeof ServiceEntity>>,
) => InstanceType<typeof ServiceEntity> = builder<InstanceType<typeof ServiceEntity>>(
    Object.assign(new ServiceEntity(), {
        id: uuid(31),
        workspaceId: WS,
        code: "SYN-HOST",
        customerId: uuid(1),
        websiteId: uuid(21),
        serviceClass: "hosting",
        provider: "inet",
        status: "active",
        statusText: null,
        startsOn: "2025-12-01",
        expiresOn: "2026-12-01",
        expirySource: "provider",
        expiryBasis: null,
        note: null,
        ...provenance,
        ...stamps,
    }),
)

/** A synthetic reminder. */
export const reminderRow: (overrides?: Partial<ServiceReminderEntity>) => ServiceReminderEntity =
    builder<ServiceReminderEntity>(
        Object.assign(new ServiceReminderEntity(), {
            id: uuid(41),
            workspaceId: WS,
            serviceId: uuid(31),
            channel: "zalo",
            outcome: "sent",
            messageRef: "msg-1",
            sentAt: new Date("2026-11-09T02:00:00.000Z"),
            requestKey: "key-1",
            requestHash: null,
            ...stamps,
        }),
    )

/** A synthetic renewal request (awaiting payment by default). */
export const renewalRow: (overrides?: Partial<RenewalRequestEntity>) => RenewalRequestEntity =
    builder<RenewalRequestEntity>(
        Object.assign(new RenewalRequestEntity(), {
            id: uuid(51),
            workspaceId: WS,
            serviceId: uuid(31),
            provider: "inet",
            termMonths: 12,
            state: "awaiting_payment",
            requestKey: "quote-1",
            requestHash: null,
            netVnd: 1_200_000,
            vatVnd: 120_000,
            totalVnd: 1_320_000,
            priceSource: "placeholder",
            paymentCode: "GHABCDEFGH",
            transactionRef: null,
            paidAt: null,
            providerRef: null,
            newExpiresOn: null,
            outcomeNote: null,
            confirmedBy: null,
            confirmedAt: null,
            ...stamps,
        }),
    )

/** A synthetic receivable. */
export const receivableRow: (
    overrides?: Partial<InstanceType<typeof ReceivableEntity>>,
) => InstanceType<typeof ReceivableEntity> = builder<InstanceType<typeof ReceivableEntity>>(
    Object.assign(new ReceivableEntity(), {
        id: uuid(61),
        workspaceId: WS,
        projectCode: "SYN-WEB",
        projectId: null,
        customerId: uuid(1),
        contractRef: null,
        totalVnd: 10_000_000,
        collectedVnd: 4_000_000,
        remainingVnd: 6_000_000,
        dueOn: "2026-10-01",
        invoicedNote: null,
        projectState: null,
        salesOwner: null,
        ...provenance,
        ...stamps,
    }),
)

/** A synthetic notice. */
export const noticeRow: (overrides?: Partial<ReceivableNoticeEntity>) => ReceivableNoticeEntity =
    builder<ReceivableNoticeEntity>(
        Object.assign(new ReceivableNoticeEntity(), {
            id: uuid(71),
            workspaceId: WS,
            receivableId: uuid(61),
            channel: "email",
            messageRef: null,
            sentAt: new Date("2026-11-05T02:00:00.000Z"),
            requestKey: "notice-1",
            requestHash: "",
            ...stamps,
        }),
    )

/** A synthetic receivable payment. */
export const receivablePaymentRow: (overrides?: Partial<ReceivablePaymentEntity>) => ReceivablePaymentEntity =
    builder<ReceivablePaymentEntity>(
        Object.assign(new ReceivablePaymentEntity(), {
            id: uuid(72),
            workspaceId: WS,
            receivableId: uuid(61),
            transactionRef: "BANK-1",
            recordedAt: new Date("2026-11-06T02:00:00.000Z"),
            ...stamps,
        }),
    )

/** A synthetic TK331 balance. */
export const payableRow: (overrides?: Partial<LedgerBalanceEntity>) => LedgerBalanceEntity =
    builder<LedgerBalanceEntity>(
        Object.assign(new LedgerBalanceEntity(), {
            id: uuid(81),
            workspaceId: WS,
            account: "331",
            partyCode: "SUP-1",
            partyName: "Synthetic Supplier",
            customerId: null,
            openingDebitVnd: 0,
            openingCreditVnd: 0,
            debitVnd: 0,
            creditVnd: 500_000,
            closingDebitVnd: 0,
            closingCreditVnd: 500_000,
            note: null,
            ...provenance,
            ...stamps,
        }),
    )

/** A synthetic supplier invoice note. */
export const payableNoteRow: (
    overrides?: Partial<InstanceType<typeof PayableNoteEntity>>,
) => InstanceType<typeof PayableNoteEntity> = builder<InstanceType<typeof PayableNoteEntity>>(
    Object.assign(new PayableNoteEntity(), {
        id: uuid(82),
        workspaceId: WS,
        partyCode: "SUP-1",
        invoiceNo: "00000001",
        issuedOn: "2026-11-01",
        einvoiceRef: null,
        note: null,
        recordedAt: new Date("2026-11-02T02:00:00.000Z"),
        requestKey: "note-1",
        requestHash: "",
        ...stamps,
    }),
)

/** A synthetic ticket. */
export const ticketRow: (overrides?: Partial<InstanceType<typeof TicketEntity>>) => InstanceType<typeof TicketEntity> =
    builder<InstanceType<typeof TicketEntity>>(
        Object.assign(new TicketEntity(), {
            id: uuid(91),
            workspaceId: WS,
            customerId: uuid(1),
            serviceIds: [uuid(31)],
            kind: "fault",
            status: "open",
            channel: "zalo",
            sourceRef: "conv-1",
            subject: "Site answers 500",
            summary: "Synthetic report",
            openedAt: new Date("2026-11-10T02:00:00.000Z"),
            closedAt: null,
            requestKey: "ticket-1",
            requestHash: "",
            ...stamps,
        }),
    )

/** A synthetic ticket note. */
export const ticketNoteRow: (
    overrides?: Partial<InstanceType<typeof TicketNoteEntity>>,
) => InstanceType<typeof TicketNoteEntity> = builder<InstanceType<typeof TicketNoteEntity>>(
    Object.assign(new TicketNoteEntity(), {
        id: uuid(92),
        workspaceId: WS,
        ticketId: uuid(91),
        body: "Checked the logs",
        statusFrom: null,
        statusTo: null,
        author: "Synthetic Staff",
        requestKey: "tn-1",
        requestHash: "",
        ...stamps,
    }),
)

/** A synthetic invoice draft. */
export const invoiceDraftRow: (overrides?: Partial<InvoiceDraftEntity>) => InvoiceDraftEntity =
    builder<InvoiceDraftEntity>(
        Object.assign(new InvoiceDraftEntity(), {
            id: uuid(101),
            workspaceId: WS,
            renewalId: uuid(51),
            customerId: uuid(1),
            lines: [
                {
                    description: "Renewal of hosting SYN-HOST, 12 months",
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
            ...stamps,
        }),
    )

/** The secret part of the synthetic credentials' bearer: 43 base64url characters, never a real key. */
export const SYNTHETIC_SECRET: string = "s".repeat(43)

/** A synthetic live service credential of workspace WS; its secret is SYNTHETIC_SECRET. */
export const serviceCredentialRow: (overrides?: Partial<ServiceCredentialEntity>) => ServiceCredentialEntity =
    builder<ServiceCredentialEntity>(
        Object.assign(new ServiceCredentialEntity(), {
            id: uuid(111),
            workspaceId: WS,
            label: "Synthetic NIVO connection",
            secretSha256: createHash("sha256").update(SYNTHETIC_SECRET, "utf8").digest("hex"),
            revokedAt: null,
            ...stamps,
        }),
    )

/** A synthetic indexed document of customer uuid(1), not yet stored; its sha256 is that of the bytes of the text `%PDF-synthetic`. */
export const documentRow: (overrides?: Partial<DocumentEntity>) => DocumentEntity = builder<DocumentEntity>(
    Object.assign(new DocumentEntity(), {
        id: uuid(61),
        workspaceId: WS,
        path: "a/hd.pdf",
        customerId: uuid(1),
        kind: "contract",
        invoiceNo: null,
        contractNo: null,
        fileName: "hd.pdf",
        sizeBytes: 14,
        sha256: createHash("sha256").update("%PDF-synthetic", "utf8").digest("hex"),
        storageKey: null,
        storedAt: null,
        ...provenance,
        ...stamps,
    }),
)

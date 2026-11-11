import type {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    RenewalRequestEntity,
    ServiceEntity,
    TicketEntity,
    TicketNoteEntity,
} from "./persistence/entities"
import type {
    ContactView,
    ContractView,
    CustomerSummaryView,
    DocumentView,
    InvoiceView,
    LedgerView,
} from "./customer.contracts"
import type { RenewalView } from "./renewal.contracts"
import type { ServiceView } from "./service.contracts"
import type { TicketNoteView, TicketSummaryView } from "./ticket.contracts"

/** An instant as ISO 8601 UTC. */
export const isoOf = (instant: Date): string => instant.toISOString()

/** An optional instant as ISO 8601 UTC. */
export const isoOrNull = (instant: Date | null): string | null => (instant === null ? null : instant.toISOString())

/** Escapes a search text for a LIKE pattern (backslash is Postgres' default escape). */
export const likeOf = (text: string): string => {
    const escaped = text.replaceAll(/[\\%_]/gu, (match) => `\\${match}`)
    return `%${escaped}%`
}

/** A customer as a list shows it. */
export const toCustomerSummary = (customer: CustomerEntity, hasContact: boolean): CustomerSummaryView => ({
    code: customer.code,
    kind: customer.kind,
    name: customer.name,
    taxId: customer.taxId,
    phone: customer.phone,
    email: customer.email,
    reachable: customer.reachable || hasContact,
})

/** A linked contact. */
export const toContactView = (contact: ContactEntity): ContactView => ({
    name: contact.name,
    preferredChannel: contact.preferredChannel,
    phone: contact.phone,
    email: contact.email,
    zaloId: contact.zaloId,
})

/** A service. */
export const toServiceView = (service: ServiceEntity, customerCode: string, domain: string | null): ServiceView => ({
    code: service.code,
    customerCode,
    domain,
    serviceClass: service.serviceClass,
    provider: service.provider,
    status: service.status,
    statusText: service.statusText,
    startsOn: service.startsOn,
    expiresOn: service.expiresOn,
    expirySource: service.expirySource,
})

/** A contract. */
export const toContractView = (contract: ContractEntity): ContractView => ({
    contractNo: contract.contractNo,
    kind: contract.kind,
    partnerName: contract.partnerName,
    valueVnd: contract.valueVnd,
    signedOn: contract.signedOn,
    effectiveOn: contract.effectiveOn,
    expiresOn: contract.expiresOn,
    autoRenew: contract.autoRenew,
    warrantyUntil: contract.warrantyUntil,
    statusText: contract.statusText,
})

/** An invoice. */
export const toInvoiceView = (invoice: InvoiceEntity): InvoiceView => ({
    invoiceNo: invoice.invoiceNo,
    issuedOn: invoice.issuedOn,
    amountVnd: invoice.amountVnd,
    hasDocument: invoice.documentPath !== null,
})

/** A document reference. */
export const toDocumentView = (document: DocumentEntity): DocumentView => ({
    path: document.path,
    kind: document.kind,
    invoiceNo: document.invoiceNo,
    contractNo: document.contractNo,
    fileName: document.fileName,
    sizeBytes: document.sizeBytes,
})

/** A TK131 balance. */
export const toLedgerView = (balance: LedgerBalanceEntity): LedgerView => ({
    openingDebitVnd: balance.openingDebitVnd,
    openingCreditVnd: balance.openingCreditVnd,
    debitVnd: balance.debitVnd,
    creditVnd: balance.creditVnd,
    closingDebitVnd: balance.closingDebitVnd,
    closingCreditVnd: balance.closingCreditVnd,
})

/** A renewal request. */
export const toRenewalView = (
    renewal: RenewalRequestEntity,
    serviceCode: string,
    customerCode: string,
): RenewalView => ({
    id: renewal.id,
    serviceCode,
    customerCode,
    provider: renewal.provider,
    termMonths: renewal.termMonths,
    state: renewal.state,
    netVnd: renewal.netVnd,
    vatVnd: renewal.vatVnd,
    totalVnd: renewal.totalVnd,
    priceSource: renewal.priceSource,
    paymentCode: renewal.paymentCode,
    transactionRef: renewal.transactionRef,
    paidAt: isoOrNull(renewal.paidAt),
    dryRun: renewal.dryRun,
    plugin: renewal.plugin,
    providerRef: renewal.providerRef,
    newExpiresOn: renewal.newExpiresOn,
    confirmedBy: renewal.confirmedBy,
    confirmedAt: isoOrNull(renewal.confirmedAt),
    createdAt: isoOf(renewal.createdAt),
})

/** A ticket as a list shows it. */
export const toTicketSummary = (
    ticket: TicketEntity,
    customerCode: string | null,
    serviceCodes: ReadonlyArray<string>,
): TicketSummaryView => ({
    id: ticket.id,
    customerCode,
    serviceCodes,
    kind: ticket.kind,
    status: ticket.status,
    channel: ticket.channel,
    sourceRef: ticket.sourceRef,
    subject: ticket.subject,
    openedAt: isoOf(ticket.openedAt),
    closedAt: isoOrNull(ticket.closedAt),
})

/** A ticket note. */
export const toTicketNoteView = (note: TicketNoteEntity): TicketNoteView => ({
    id: note.id,
    body: note.body,
    statusFrom: note.statusFrom,
    statusTo: note.statusTo,
    author: note.author,
    createdAt: isoOf(note.createdAt),
})

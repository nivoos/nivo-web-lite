import type {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    ImportIssueEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    ProjectEntity,
    ProviderAccountEntity,
    PurchaseEntity,
    PurchaseFollowupEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import type { SnapshotItem } from "./snapshot.contracts"

/** The natural keys a workspace's rows are written back with: a customer id to its code, a website id to its domain. */
export interface SnapshotNames {
    /** Customer id to code. */
    readonly customers: ReadonlyMap<string, string>
    /** Website id to domain. */
    readonly websites: ReadonlyMap<string, string>
    /** Purchase id to code. */
    readonly purchases: ReadonlyMap<string, string>
}

/** A format @1 money value of whole VND, or null when the source has none. */
const moneyOf = (amount: number | null): { readonly amount: number; readonly currency: "VND" } | null =>
    amount === null ? null : { amount, currency: "VND" }

/** The source place a sourced row keeps. */
interface SourcePlace {
    readonly sourceFile: string
    readonly sourceSheet: string
    readonly sourceRow: number
}

/** The provenance of a sourced row. */
const originOf = (row: SourcePlace) => ({
    file: row.sourceFile,
    sheet: row.sourceSheet,
    row: row.sourceRow,
})

/** The natural key a reference id is written back as (null when the row references none). */
const nameOf = (names: ReadonlyMap<string, string>, id: string | null): string | null =>
    id === null ? null : (names.get(id) ?? null)

/** A customer item. */
export const customerItemOf = (row: CustomerEntity): SnapshotItem => ({
    code: row.code,
    kind: row.kind,
    name: row.name,
    taxId: row.taxId,
    address: row.address,
    phone: row.phone,
    email: row.email,
    folderPath: row.folderPath,
    origin: originOf(row),
})

/** A website item. */
export const websiteItemOf = (row: WebsiteEntity, names: SnapshotNames): SnapshotItem => ({
    customerCode: nameOf(names.customers, row.customerId),
    domain: row.domain,
    origin: originOf(row),
})

/** A provider item; an account the CRM made itself names its own provider as plugin. */
export const providerItemOf = (row: ProviderAccountEntity): SnapshotItem => ({
    key: row.provider,
    mode: row.mode,
    plugin: row.plugin ?? row.provider,
})

/** A service item; no provider is the format's empty provider. */
export const serviceItemOf = (row: ServiceEntity, names: SnapshotNames): SnapshotItem => ({
    code: row.code,
    customerCode: nameOf(names.customers, row.customerId),
    domain: nameOf(names.websites, row.websiteId),
    class: row.serviceClass,
    provider: row.provider ?? "",
    status: row.status,
    statusText: row.statusText,
    startsOn: row.startsOn,
    expiresOn: row.expiresOn,
    expiryBasis: row.expiryBasis,
    expirySource: row.expirySource,
    note: row.note,
    origin: originOf(row),
})

/** A project item. */
export const projectItemOf = (row: ProjectEntity, names: SnapshotNames): SnapshotItem => ({
    code: row.code,
    customerCode: nameOf(names.customers, row.customerId),
    domain: nameOf(names.websites, row.websiteId),
    name: row.name,
    contractNo: row.contractNo,
    contractState: row.contractState,
    value: moneyOf(row.valueVnd),
    collected: moneyOf(row.collectedVnd),
    remaining: moneyOf(row.remainingVnd),
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    statusText: row.statusText,
    note: row.note,
    origin: originOf(row),
})

/** A contract item. */
export const contractItemOf = (row: ContractEntity, names: SnapshotNames): SnapshotItem => ({
    contractNo: row.contractNo,
    kind: row.kind,
    customerCode: nameOf(names.customers, row.customerId),
    partnerName: row.partnerName,
    content: row.content,
    value: moneyOf(row.valueVnd),
    signedOn: row.signedOn,
    effectiveOn: row.effectiveOn,
    expiresOn: row.expiresOn,
    autoRenew: row.autoRenew,
    warrantyUntil: row.warrantyUntil,
    ownerName: row.ownerName,
    statusText: row.statusText,
    storageRef: row.storageRef,
    origin: originOf(row),
})

/** A document index item (no provenance: the format's documents carry none). */
export const documentItemOf = (row: DocumentEntity, names: SnapshotNames): SnapshotItem => ({
    path: row.path,
    customerCode: nameOf(names.customers, row.customerId),
    kind: row.kind,
    invoiceNo: row.invoiceNo,
    contractNo: row.contractNo,
    fileName: row.fileName,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256 ?? "",
})

/** An invoice item, with the customer code the source wrote (a soft reference). */
export const invoiceItemOf = (row: InvoiceEntity): SnapshotItem => ({
    invoiceNo: row.invoiceNo,
    customerCode: row.customerCode,
    issuedOn: row.issuedOn,
    amount: moneyOf(row.amountVnd),
    documentPath: row.documentPath,
    origin: originOf(row),
})

/** A receivable item. */
export const receivableItemOf = (row: ReceivableEntity): SnapshotItem => ({
    projectCode: row.projectCode,
    contractRef: row.contractRef,
    total: moneyOf(row.totalVnd),
    collected: moneyOf(row.collectedVnd),
    remaining: moneyOf(row.remainingVnd),
    invoicedNote: row.invoicedNote,
    projectState: row.projectState,
    salesOwner: row.salesOwner,
    origin: originOf(row),
})

/** A TK131 / TK331 balance item. */
export const balanceItemOf = (row: LedgerBalanceEntity): SnapshotItem => ({
    account: row.account,
    partyCode: row.partyCode,
    partyName: row.partyName,
    openingDebit: moneyOf(row.openingDebitVnd),
    openingCredit: moneyOf(row.openingCreditVnd),
    debit: moneyOf(row.debitVnd),
    credit: moneyOf(row.creditVnd),
    closingDebit: moneyOf(row.closingDebitVnd),
    closingCredit: moneyOf(row.closingCreditVnd),
    note: row.note,
    origin: originOf(row),
})

/** A contact item; a contact a person or a flow added has no source place (empty file and sheet, row 0). */
export const contactItemOf = (row: ContactEntity, names: SnapshotNames): SnapshotItem => ({
    customerCode: nameOf(names.customers, row.customerId),
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    origin: { file: row.sourceFile ?? "", sheet: row.sourceSheet ?? "", row: row.sourceRow ?? 0 },
})

/** An import issue item. */
export const issueItemOf = (row: ImportIssueEntity): SnapshotItem => ({
    entity: row.entity,
    field: row.field,
    reason: row.reason,
    severity: row.severity,
    raw: row.raw,
    origin: originOf(row),
})

/** An instant as ISO 8601 UTC text, or null. */
const instantOf = (value: Date | null): string | null => (value === null ? null : value.toISOString())

/** The quote of a purchase as the format writes it (money values, lines), or null before the first quote. */
const quoteItemOf = (row: PurchaseEntity) =>
    row.lines === null
        ? null
        : {
              lines: row.lines.map((line) => ({
                  priceCode: line.priceCode,
                  name: line.name,
                  termMonths: line.termMonths,
                  quantity: line.quantity,
                  unitPrice: moneyOf(line.unitPriceVnd),
                  amount: moneyOf(line.amountVnd),
              })),
              net: moneyOf(row.netVnd),
              vatRatePercent: row.vatRatePercent,
              vat: moneyOf(row.vatVnd),
              total: moneyOf(row.totalVnd),
              priceSource: row.priceSource,
              quotedOn: row.quotedOn,
              validUntil: row.validUntil,
          }

/** A purchase item (format @1 extension). */
export const purchaseItemOf = (row: PurchaseEntity): SnapshotItem => ({
    code: row.code,
    state: row.state,
    channel: row.channel,
    sourceRef: row.sourceRef,
    need: row.need,
    contactName: row.contactName,
    phone: row.phone,
    email: row.email,
    domain: row.domain,
    customerCode: row.customerCode,
    quote: quoteItemOf(row),
    paymentCode: row.paymentCode,
    transactionRef: row.transactionRef,
    paidAt: instantOf(row.paidAt),
    acceptedAt: instantOf(row.acceptedAt),
    projectCode: row.projectCode,
    contractNo: row.contractNo,
    note: row.note,
    confirmedBy: row.confirmedBy,
    confirmedAt: instantOf(row.confirmedAt),
})

/** A follow-up item, its purchase by code. */
export const followUpItemOf = (row: PurchaseFollowupEntity, names: SnapshotNames): SnapshotItem => ({
    purchaseCode: nameOf(names.purchases, row.purchaseId),
    day: row.day,
    channel: row.channel,
    outcome: row.outcome,
    messageRef: row.messageRef,
})

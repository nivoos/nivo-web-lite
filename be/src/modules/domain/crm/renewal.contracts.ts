import type { PageInput } from "@modules/platform/pagination"
import type { ServiceClass } from "./service.contracts"

/**
 * The life cycle of a renewal request, as the CRM STORES it (it renews nothing itself): the customer pays first, the Renewal agent
 * renews at the provider with its own provider account and records what the provider answered (`renewed`, `failed`, or
 * `pending_person`: the provider's answer is pending or unknown, a person follows up and records the end).
 */
export type RenewalState = "awaiting_payment" | "paid" | "pending_person" | "renewed" | "failed" | "cancelled"

/** What the provider answered for a paid renewal, as the agent (or a person) records it. */
export type RenewalOutcome = "renewed" | "failed" | "pending"

/** Where a price came from. */
export type PriceSource = "placeholder" | "price_sheet"

/** One price of the price table. */
export interface PriceView {
    /** The service class. */
    readonly serviceClass: ServiceClass
    /** The term, months. */
    readonly termMonths: number
    /** Before VAT, whole VND. */
    readonly netVnd: number
    /** VAT rate, percent. */
    readonly vatRatePercent: number
    /** VAT, whole VND. */
    readonly vatVnd: number
    /** What the customer pays, whole VND. */
    readonly totalVnd: number
    /** placeholder until the owner's price sheet is loaded. */
    readonly priceSource: PriceSource
}

/** Whether a price row sells something NEW or renews what a customer has. */
export type PriceKind = "new" | "renewal"

/** One row of the price table, as `price.list` shows it and a quote prices from it. */
export interface PriceRowView {
    /** The row's code: what a quote names. */
    readonly priceCode: string
    /** The row's name. */
    readonly name: string
    /** A NEW sale or a renewal. */
    readonly kind: PriceKind
    /** The service class, or `website` for a website build. */
    readonly serviceClass: ServiceClass | "website"
    /** The term priced, months; null for a one-time row (a website build). */
    readonly termMonths: number | null
    /** The one-time set-up price, whole VND before VAT (0 when none). */
    readonly setupVnd: number
    /** The term's price, whole VND before VAT (0 for a one-time row). */
    readonly netVnd: number
    /** VAT rate, percent. */
    readonly vatRatePercent: number
    /** VAT of set-up plus term, whole VND. */
    readonly vatVnd: number
    /** What the customer pays for one, whole VND. */
    readonly totalVnd: number
    /** The instalments as percents of the total, in order (terms as data; one instalment of 100 when the row has no terms). */
    readonly instalmentPercents: ReadonlyArray<number>
    /** placeholder until the owner's price sheet is loaded. */
    readonly priceSource: PriceSource
}

/** A renewal request. */
export interface RenewalView {
    /** The id. */
    readonly id: string
    /** The service. */
    readonly serviceCode: string
    /** The customer. */
    readonly customerCode: string
    /** The service's provider. */
    readonly provider: string
    /** The term, months. */
    readonly termMonths: number
    /** The state. */
    readonly state: RenewalState
    /** Before VAT, whole VND. */
    readonly netVnd: number | null
    /** VAT, whole VND. */
    readonly vatVnd: number | null
    /** What the customer pays, whole VND. */
    readonly totalVnd: number | null
    /** Where the price came from. */
    readonly priceSource: PriceSource
    /** The code the customer writes in the transfer. */
    readonly paymentCode: string | null
    /** The bank row that proved the payment. */
    readonly transactionRef: string | null
    /** When the payment was recorded. */
    readonly paidAt: string | null
    /** The provider's reference of the renewal (its order or transaction id), as recorded. */
    readonly providerRef: string | null
    /** The end date after the renewal. */
    readonly newExpiresOn: string | null
    /** Who recorded the outcome (the agent or a person). */
    readonly confirmedBy: string | null
    /** When. */
    readonly confirmedAt: string | null
    /** When the request was opened. */
    readonly createdAt: string
}

/** Opens a renewal request on the customer's yes. */
export interface QuoteInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The replay key. */
    readonly requestKey: string
    /** The service. */
    readonly serviceCode: string
    /** The term, months. */
    readonly termMonths: number
}

/** Names one renewal. */
export interface RenewalKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The renewal id. */
    readonly id: string
}

/** Lists the open requests. */
export interface RenewalOpenListInput {
    /** The workspace. */
    readonly workspaceId: string
    /** Only this customer's requests. */
    readonly customerCode: string | null
    /** Only the open requests in this state; null: every open state. */
    readonly state: RenewalState | null
    /** The page. */
    readonly page: PageInput
}

/** Records the payment of a renewal by the bank row's reference. */
export interface RenewalPaymentInput extends RenewalKey {
    /** The bank transaction's id. */
    readonly transactionRef: string
}

/** Records what the provider answered for a paid renewal (the renewal itself happened at the provider, never in the CRM). */
export interface RenewalOutcomeInput extends RenewalKey {
    /** renewed, failed, or pending (the provider's answer is pending or unknown). */
    readonly outcome: RenewalOutcome
    /** The provider's reference of the renewal, when it gave one. */
    readonly providerRef: string | null
    /** The new end date (renewed). */
    readonly newExpiresOn: string | null
    /** Who records (the agent or a person). */
    readonly confirmedBy: string
    /** A short note. */
    readonly note: string | null
}

/** Lists the price table. */
export interface PriceListInput {
    /** The workspace (prices are per workspace once the sheet is loaded). */
    readonly workspaceId: string
    /** Only the rows of this kind: a NEW sale or a renewal; null: both. */
    readonly kind: PriceKind | null
    /** The page. */
    readonly page: PageInput
}

/** One line of an invoice draft. */
export interface InvoiceDraftLineView {
    /** What is invoiced. */
    readonly description: string
    /** How many. */
    readonly quantity: number
    /** Price of one before VAT, whole VND. */
    readonly unitPriceVnd: number
    /** quantity x unit price, whole VND. */
    readonly amountVnd: number
}

/** The invoice draft of a renewal. */
export interface InvoiceDraftView {
    /** The id. */
    readonly id: string
    /** The renewal it drafts, or null for a purchase. */
    readonly renewalId: string | null
    /** The purchase it drafts, or null for a renewal. */
    readonly purchaseId: string | null
    /** The customer. */
    readonly customerCode: string
    /** The lines. */
    readonly lines: ReadonlyArray<InvoiceDraftLineView>
    /** Before VAT, whole VND. */
    readonly netVnd: number
    /** VAT rate, percent. */
    readonly vatRatePercent: number
    /** VAT, whole VND. */
    readonly vatVnd: number
    /** Total, whole VND. */
    readonly totalVnd: number
    /** draft, or issued once the e-invoice MISA issued is recorded on it. */
    readonly state: InvoiceDraftState
    /** Where the price came from. */
    readonly priceSource: PriceSource
    /** The number of the e-invoice issued for the draft, or null while it is a draft. */
    readonly invoiceNo: string | null
    /** The e-invoice provider's reference of that invoice (MISA meInvoice's transaction id), when it gave one. */
    readonly providerRef: string | null
    /** The issue date of that invoice. */
    readonly issuedOn: string | null
}

/** A draft, or a draft whose e-invoice was issued (by the Accounting agent at MISA) and recorded. */
export type InvoiceDraftState = "draft" | "issued"

/** Creates the draft of a renewal OR of a purchase (exactly one is named). */
export interface InvoiceDraftCreateInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The paid renewal, or null. */
    readonly renewalId: string | null
    /** The paid purchase, or null. */
    readonly purchaseId: string | null
}

/** Names one draft. */
export interface InvoiceDraftKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The draft id. */
    readonly id: string
}

/** Records the e-invoice issued for a draft (issued at MISA by the Accounting agent; the CRM issues nothing). */
export interface InvoiceIssuedInput extends InvoiceDraftKey {
    /** The invoice number MISA gave. */
    readonly invoiceNo: string
    /** MISA's reference of the invoice, when it gave one. */
    readonly providerRef: string | null
    /** The issue date. */
    readonly issuedOn: string
}

import type { PageInput } from "@modules/platform/pagination"
import type { ServiceClass } from "./service.contracts"

/** The life cycle of a renewal request: the customer pays first, then the provider step, then a person's confirmation. */
export type RenewalState = "awaiting_payment" | "paid" | "pending_person" | "renewed" | "failed" | "cancelled"

/** The provider plugins. */
export type RenewalPlugin = "manual" | "fixture"

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
    /** True while nothing was asked of a real provider. */
    readonly dryRun: boolean
    /** The plugin that took the provider step. */
    readonly plugin: RenewalPlugin | null
    /** The provider's (or the mock's) reference. */
    readonly providerRef: string | null
    /** The end date after the renewal. */
    readonly newExpiresOn: string | null
    /** Who confirmed the outcome. */
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
    /** The page. */
    readonly page: PageInput
}

/** Records the payment of a renewal by the bank row's reference. */
export interface RenewalPaymentInput extends RenewalKey {
    /** The bank transaction's id. */
    readonly transactionRef: string
}

/** Asks the provider plugin to renew a paid request. */
export interface RenewalExecuteInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The service named in the path; must be the request's. */
    readonly serviceCode: string
    /** The renewal request. */
    readonly renewalId: string
    /** The replay key. */
    readonly requestKey: string
    /** True (default): ask no real provider. */
    readonly dryRun: boolean
}

/** A person confirms what happened at the provider. */
export interface RenewalOutcomeInput extends RenewalKey {
    /** renewed or failed. */
    readonly outcome: "renewed" | "failed"
    /** The new end date (renewed). */
    readonly newExpiresOn: string | null
    /** Who confirms. */
    readonly confirmedBy: string
    /** A short note. */
    readonly note: string | null
}

/** Lists the price table. */
export interface PriceListInput {
    /** The workspace (prices are per workspace once the sheet is loaded). */
    readonly workspaceId: string
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
    /** The renewal. */
    readonly renewalId: string
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
    /** draft. */
    readonly state: "draft"
    /** Where the price came from. */
    readonly priceSource: PriceSource
}

/** Creates the draft of a renewal. */
export interface InvoiceDraftCreateInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The renewal. */
    readonly renewalId: string
}

/** Names one draft. */
export interface InvoiceDraftKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The draft id. */
    readonly id: string
}

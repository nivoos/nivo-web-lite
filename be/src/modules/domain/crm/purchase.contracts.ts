import type { PageInput } from "@modules/platform/pagination"
import type { PriceSource } from "./renewal.contracts"

/** Where a NEW sale stands (AGENTS-GRAPHS §9.1-5). */
export type PurchaseState =
    "enquiry" | "quoted" | "awaiting_payment" | "paid" | "pending_person" | "delivered" | "lost" | "cancelled"

/** The channel an enquiry or a follow-up went by. */
export type PurchaseChannel = "zalo" | "email" | "phone" | "web" | "other"

/** What came of one follow-up. */
export type FollowUpOutcome = "sent" | "answered" | "no_answer" | "declined"

/** One line of a quote as stored: a price row of the table, how many, and its amount before VAT. */
export interface PurchaseLineValue {
    /** The price row. */
    readonly priceCode: string
    /** The row's name. */
    readonly name: string
    /** The term priced, months; null for a one-time row (a website build). */
    readonly termMonths: number | null
    /** How many. */
    readonly quantity: number
    /** Set-up plus the term's price of one, whole VND before VAT. */
    readonly unitPriceVnd: number
    /** quantity x unit price. */
    readonly amountVnd: number
}

/** Opens (or answers the open) purchase of one enquiry. */
export interface PurchaseCreateInput {
    /** The enterprise workspace of the calling credential. */
    readonly workspaceId: string
    /** The channel it came or went by. */
    readonly channel: PurchaseChannel
    /** The conversation or mail id the enquiry came from; one open purchase per channel and source. */
    readonly sourceRef: string
    /** The need as the person said it. */
    readonly need: string
    /** The contact's name as said (null: unchanged or not said). */
    readonly contactName: string | null
    /** The contact's phone as said (null: unchanged or not said). */
    readonly phone: string | null
    /** The contact's mail as said (null: unchanged or not said). */
    readonly email: string | null
    /** The domain the need is about, as said (null: unchanged or not said). */
    readonly domain: string | null
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string | null
}

/** One purchase of a workspace. */
export interface PurchaseKey {
    /** The enterprise workspace of the calling credential. */
    readonly workspaceId: string
    /** The purchase id. */
    readonly id: string
}

/** What `purchase.update` may change: the need, the contact as said, or the move to `lost` with a note. */
export interface PurchaseUpdateInput extends PurchaseKey {
    /** The need as the person said it. */
    readonly need: string | null
    /** The contact's name as said (null: unchanged or not said). */
    readonly contactName: string | null
    /** The contact's phone as said (null: unchanged or not said). */
    readonly phone: string | null
    /** The contact's mail as said (null: unchanged or not said). */
    readonly email: string | null
    /** The domain the need is about, as said (null: unchanged or not said). */
    readonly domain: string | null
    /** Where the purchase stands. */
    readonly state: "lost" | null
    /** A note: why it was lost, or the person's note on the outcome. */
    readonly note: string | null
}

/** One item a quote is asked for. */
export interface QuoteItemInput {
    /** The price row quoted. */
    readonly priceCode: string
    /** The term priced, months; null for a one-time row or to take the row's own term. */
    readonly termMonths: number | null
    /** How many (1 when null). */
    readonly quantity: number | null
}

/** A quote of a purchase from the price table. */
export interface PurchaseQuoteInput extends PurchaseKey {
    /** What is quoted, one item per price row. */
    readonly items: ReadonlyArray<QuoteItemInput>
}

/** One follow-up of a purchase. */
export interface FollowUpInput extends PurchaseKey {
    /** The channel it came or went by. */
    readonly channel: PurchaseChannel
    /** What came of it. */
    readonly outcome: FollowUpOutcome
    /** The message id on the channel, if any. */
    readonly messageRef: string | null
}

/** A new customer of the books, opened for a purchase. */
export interface CustomerCreateInput {
    /** The enterprise workspace of the calling credential. */
    readonly workspaceId: string
    /** The purchase the customer is opened for. */
    readonly purchaseId: string
    /** A company or a person. */
    readonly kind: "company" | "person"
    /** The name as the customer gives it. */
    readonly name: string
    /** The tax id, if any. */
    readonly taxId: string | null
    /** The address, if any. */
    readonly address: string | null
    /** The contact's phone as said (null: unchanged or not said). */
    readonly phone: string | null
    /** The contact's mail as said (null: unchanged or not said). */
    readonly email: string | null
}

/** The acceptance of a purchase's quote by a customer of the books. */
export interface AcceptInput extends PurchaseKey {
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string
    /** True: show what the acceptance would open and write nothing. */
    readonly dryRun: boolean
}

/** The bank row that proves the payment of a purchase (no amount). */
export interface PurchasePaymentInput extends PurchaseKey {
    /** The bank row that proves the payment. */
    readonly transactionRef: string
}

/** A person's outcome of a purchase. */
export interface PurchaseOutcomeInput extends PurchaseKey {
    /** What came of it. */
    readonly outcome: "delivered" | "cancelled"
    /** The person who confirms the outcome. */
    readonly confirmedBy: string
    /** A note: why it was lost, or the person's note on the outcome. */
    readonly note: string | null
}

/** The open purchases, by state or source. */
export interface PurchaseOpenListInput {
    /** The enterprise workspace of the calling credential. */
    readonly workspaceId: string
    /** Where the purchase stands. */
    readonly state: PurchaseState | null
    /** The conversation or mail id the enquiry came from; one open purchase per channel and source. */
    readonly sourceRef: string | null
    /** The page. */
    readonly page: PageInput
}

/** The workspace's contracts, by number. */
export interface ContractListInput {
    /** The enterprise workspace of the calling credential. */
    readonly workspaceId: string
    /** A company or a person. */
    readonly kind: string | null
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string | null
    /** The page. */
    readonly page: PageInput
}

/** A quote as shown. */
export interface QuoteView {
    /** The quote's lines. */
    readonly lines: ReadonlyArray<PurchaseLineValue>
    /** Before VAT, whole VND. */
    readonly netVnd: number
    /** VAT rate, percent. */
    readonly vatRatePercent: number
    /** VAT, whole VND. */
    readonly vatVnd: number
    /** What the customer pays, whole VND. */
    readonly totalVnd: number
    /** Where the prices came from. */
    readonly priceSource: PriceSource
    /** The day of the quote. */
    readonly quotedOn: string
    /** The last day the quote holds. */
    readonly validUntil: string
}

/** A follow-up as shown. */
export interface FollowUpView {
    /** The day of the follow-up. */
    readonly day: string
    /** The channel it came or went by. */
    readonly channel: PurchaseChannel
    /** What came of it. */
    readonly outcome: FollowUpOutcome
    /** The message id on the channel, if any. */
    readonly messageRef: string | null
}

/** A purchase as shown. */
export interface PurchaseView {
    /** The purchase id. */
    readonly id: string
    /** The purchase's own code (`MUA-` + 8 characters). */
    readonly code: string
    /** Where the purchase stands. */
    readonly state: PurchaseState
    /** The channel it came or went by. */
    readonly channel: PurchaseChannel
    /** The conversation or mail id the enquiry came from; one open purchase per channel and source. */
    readonly sourceRef: string
    /** The need as the person said it. */
    readonly need: string
    /** The contact's name as said (null: unchanged or not said). */
    readonly contactName: string | null
    /** The contact's phone as said (null: unchanged or not said). */
    readonly phone: string | null
    /** The contact's mail as said (null: unchanged or not said). */
    readonly email: string | null
    /** The domain the need is about, as said (null: unchanged or not said). */
    readonly domain: string | null
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string | null
    /** The current quote, or null before the first. */
    readonly quote: QuoteView | null
    /** The transfer code of the first instalment. */
    readonly paymentCode: string | null
    /** The bank row that proves the payment. */
    readonly transactionRef: string | null
    /** When the payment was recorded (ISO 8601 UTC). */
    readonly paidAt: string | null
    /** When the acceptance was recorded (ISO 8601 UTC). */
    readonly acceptedAt: string | null
    /** The project the acceptance opened, if any. */
    readonly projectCode: string | null
    /** The contract record the acceptance opened. */
    readonly contractNo: string | null
    /** A note: why it was lost, or the person's note on the outcome. */
    readonly note: string | null
    /** The follow-ups by day. */
    readonly followUps: ReadonlyArray<FollowUpView>
}

/** An open purchase in the list, with its follow-up facts. */
export interface PurchaseSummaryView {
    /** The purchase id. */
    readonly id: string
    /** The purchase's own code (`MUA-` + 8 characters). */
    readonly code: string
    /** Where the purchase stands. */
    readonly state: PurchaseState
    /** The channel it came or went by. */
    readonly channel: PurchaseChannel
    /** The conversation or mail id the enquiry came from; one open purchase per channel and source. */
    readonly sourceRef: string
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string | null
    /** The day of the quote. */
    readonly quotedOn: string | null
    /** The last day the quote holds. */
    readonly validUntil: string | null
    /** The day of the last follow-up. */
    readonly lastFollowUpOn: string | null
    /** How many follow-ups were recorded. */
    readonly followUpCount: number
    /** True when the last follow-up was sent and has had no answer yet. */
    readonly openFollowUp: boolean
    /** True when the enquiry left a phone or a mail. */
    readonly reachable: boolean
}

/** What an acceptance opened (or, dry, would open). */
export interface AcceptView {
    /** True: show what the acceptance would open and write nothing. */
    readonly dryRun: boolean
    /** The purchase as accepted (dry: as it stands). */
    readonly purchase: PurchaseView
    /** The project the acceptance opened, if any. */
    readonly projectCode: string | null
    /** The contract record the acceptance opened. */
    readonly contractNo: string
    /** The services opened, not yet active. */
    readonly serviceCodes: ReadonlyArray<string>
    /** The transfer code of the first instalment. */
    readonly paymentCode: string
    /** The first instalment the payment code asks for, whole VND. */
    readonly firstInstalmentVnd: number
}

/** A new customer's code. */
export interface CustomerCreatedView {
    /** The customer code of the books it is for (null: none yet). */
    readonly customerCode: string
}

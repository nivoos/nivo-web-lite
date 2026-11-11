import { ApiProperty } from "@nestjs/swagger"

/** One line of a quote. */
export class QuoteLineResponse {
    /** The price row. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly priceCode!: string

    /** The row's name. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly name!: string

    /** The term priced, months; null for a one-time row. */
    @ApiProperty({ type: "integer", nullable: true })
    readonly termMonths!: number | null

    /** How many. */
    @ApiProperty({ type: "integer", minimum: 1 })
    readonly quantity!: number

    /** Set-up plus the term's price of one, whole VND before VAT. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly unitPriceVnd!: number

    /** quantity x unit price. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly amountVnd!: number
}

/** A quote, every amount computed by the CRM. */
export class QuoteResponse {
    /** The lines. */
    @ApiProperty({ type: QuoteLineResponse, isArray: true, maxItems: 20 })
    readonly lines!: ReadonlyArray<QuoteLineResponse>

    /** Before VAT, whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly netVnd!: number

    /** VAT rate, percent. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100 })
    readonly vatRatePercent!: number

    /** VAT, whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly vatVnd!: number

    /** What the customer pays, whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly totalVnd!: number

    /** Where the prices came from. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: "placeholder" | "price_sheet"

    /** The day of the quote. */
    @ApiProperty({ type: String, format: "date" })
    readonly quotedOn!: string

    /** The last day it holds. */
    @ApiProperty({ type: String, format: "date" })
    readonly validUntil!: string
}

/** One follow-up. */
export class FollowUpResponse {
    /** The day. */
    @ApiProperty({ type: String, format: "date" })
    readonly day!: string

    /** The channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "web", "other"] })
    readonly channel!: ChannelValue

    /** What came of it. */
    @ApiProperty({ type: String, enum: ["sent", "answered", "no_answer", "declined"] })
    readonly outcome!: "sent" | "answered" | "no_answer" | "declined"

    /** The message id on the channel. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly messageRef!: string | null
}

/** The states of a purchase. */
const STATES = [
    "enquiry",
    "quoted",
    "awaiting_payment",
    "paid",
    "pending_person",
    "delivered",
    "lost",
    "cancelled",
] as const

/** Where a purchase stands. */
type PurchaseStateValue = (typeof STATES)[number]

/** The channels of an enquiry or a follow-up. */
type ChannelValue = "zalo" | "email" | "phone" | "web" | "other"

/** A purchase: a NEW sale from enquiry to delivery. */
export class PurchaseResponse {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** Its own code, `MUA-` + 8 characters. */
    @ApiProperty({ type: String, maxLength: 12 })
    readonly code!: string

    /** Where it stands. */
    @ApiProperty({ type: String, enum: [...STATES] })
    readonly state!: PurchaseStateValue

    /** The channel the enquiry came by. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "web", "other"] })
    readonly channel!: ChannelValue

    /** The conversation or mail id it came from. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly sourceRef!: string

    /** The need as said. */
    @ApiProperty({ type: String, maxLength: 4000 })
    readonly need!: string

    /** The contact's name as said. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly contactName!: string | null

    /** The contact's phone as said. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly phone!: string | null

    /** The contact's mail as said. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly email!: string | null

    /** The domain as said. */
    @ApiProperty({ type: String, maxLength: 253, nullable: true })
    readonly domain!: string | null

    /** The customer of the books it is for. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The current quote. */
    @ApiProperty({ type: QuoteResponse, nullable: true })
    readonly quote!: QuoteResponse | null

    /** The transfer code of the first instalment. */
    @ApiProperty({ type: String, maxLength: 20, nullable: true })
    readonly paymentCode!: string | null

    /** The bank row that proved the payment. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly transactionRef!: string | null

    /** When the payment was recorded. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly paidAt!: string | null

    /** When the acceptance was recorded. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly acceptedAt!: string | null

    /** The project the acceptance opened. */
    @ApiProperty({ type: String, maxLength: 120, nullable: true })
    readonly projectCode!: string | null

    /** The contract record the acceptance opened. */
    @ApiProperty({ type: String, maxLength: 120, nullable: true })
    readonly contractNo!: string | null

    /** A note. */
    @ApiProperty({ type: String, maxLength: 1000, nullable: true })
    readonly note!: string | null

    /** The follow-ups by day. */
    @ApiProperty({ type: FollowUpResponse, isArray: true, maxItems: 200 })
    readonly followUps!: ReadonlyArray<FollowUpResponse>
}

/** An open purchase with its follow-up facts. */
export class PurchaseSummaryResponse {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** Its own code. */
    @ApiProperty({ type: String, maxLength: 12 })
    readonly code!: string

    /** Where it stands. */
    @ApiProperty({ type: String, enum: [...STATES] })
    readonly state!: PurchaseStateValue

    /** The channel the enquiry came by. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "web", "other"] })
    readonly channel!: ChannelValue

    /** The conversation or mail id it came from. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly sourceRef!: string

    /** The customer of the books it is for. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The day of the quote. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly quotedOn!: string | null

    /** The last day the quote holds. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly validUntil!: string | null

    /** The day of the last follow-up. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly lastFollowUpOn!: string | null

    /** How many follow-ups. */
    @ApiProperty({ type: "integer", minimum: 0 })
    readonly followUpCount!: number

    /** True when the last follow-up was sent and has had no answer yet. */
    @ApiProperty({ type: Boolean })
    readonly openFollowUp!: boolean

    /** True when the enquiry left a phone or a mail. */
    @ApiProperty({ type: Boolean })
    readonly reachable!: boolean
}

/** One page of open purchases. */
export class PurchaseSummaryPageResponse {
    /** The purchases of this page. */
    @ApiProperty({ type: PurchaseSummaryResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<PurchaseSummaryResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** What an acceptance opened (or, dry, would open). */
export class AcceptanceResponse {
    /** True: nothing was written. */
    @ApiProperty({ type: Boolean })
    readonly dryRun!: boolean

    /** The purchase as accepted (dry: as it stands). */
    @ApiProperty({ type: PurchaseResponse })
    readonly purchase!: PurchaseResponse

    /** The project opened when the quote builds a website. */
    @ApiProperty({ type: String, maxLength: 120, nullable: true })
    readonly projectCode!: string | null

    /** The contract record opened. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly contractNo!: string

    /** The services opened, not yet active. */
    @ApiProperty({ type: String, isArray: true, maxItems: 20 })
    readonly serviceCodes!: ReadonlyArray<string>

    /** The transfer code of the first instalment. */
    @ApiProperty({ type: String, maxLength: 20 })
    readonly paymentCode!: string

    /** The first instalment, whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly firstInstalmentVnd!: number
}

/** A new customer's code in the books. */
export class CustomerCreatedResponse {
    /** The new customer code. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string
}

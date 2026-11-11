import { ApiProperty } from "@nestjs/swagger"
import type { RenewalView } from "@modules/domain/crm"

/** A renewal request. */
export class RenewalResponse implements RenewalView {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The service. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly serviceCode!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** The service's provider. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly provider!: string

    /** The term, months. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 120 })
    readonly termMonths!: number

    /** awaiting_payment -> paid -> pending_person -> renewed | failed (or cancelled). */
    @ApiProperty({
        type: String,
        enum: ["awaiting_payment", "paid", "pending_person", "renewed", "failed", "cancelled"],
    })
    readonly state!: RenewalView["state"]

    /** Before VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly netVnd!: number | null

    /** VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly vatVnd!: number | null

    /** What the customer pays. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly totalVnd!: number | null

    /** placeholder until the owner's price sheet is loaded. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: RenewalView["priceSource"]

    /** The code the customer writes in the transfer. */
    @ApiProperty({ type: String, maxLength: 20, nullable: true })
    readonly paymentCode!: string | null

    /** The bank row that proved the payment. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly transactionRef!: string | null

    /** When the payment was recorded. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly paidAt!: string | null

    /** True while nothing was asked of a real provider. */
    @ApiProperty({ type: Boolean })
    readonly dryRun!: boolean

    /** The plugin that took the provider step. */
    @ApiProperty({ type: String, enum: ["manual", "mock"], nullable: true })
    readonly plugin!: RenewalView["plugin"] | null

    /** The provider's (or the mock's) reference. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly providerRef!: string | null

    /** The end date after the renewal. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly newExpiresOn!: string | null

    /** Who confirmed the outcome. */
    @ApiProperty({ type: String, maxLength: 120, nullable: true })
    readonly confirmedBy!: string | null

    /** When. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly confirmedAt!: string | null

    /** When the request was opened. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly createdAt!: string
}

/** One page of open renewal requests. */
export class RenewalPageResponse {
    /** The open renewal requests of this page. */
    @ApiProperty({ type: RenewalResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<RenewalResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

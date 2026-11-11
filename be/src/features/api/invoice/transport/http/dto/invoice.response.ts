import { ApiProperty } from "@nestjs/swagger"
import type { InvoiceDraftView } from "@modules/domain/crm"

/** One line of an invoice draft. */
export class InvoiceDraftLineResponse {
    /** What is invoiced. */
    @ApiProperty({ type: String, maxLength: 400 })
    readonly description!: string

    /** How many. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 1000 })
    readonly quantity!: number

    /** Price of one before VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly unitPriceVnd!: number

    /** quantity x unit price. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly amountVnd!: number
}

/** The invoice draft of a renewal (data only; issuing is a later provider). */
export class InvoiceDraftResponse implements InvoiceDraftView {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The renewal. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly renewalId!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** The lines. */
    @ApiProperty({ type: InvoiceDraftLineResponse, isArray: true, maxItems: 20 })
    readonly lines!: ReadonlyArray<InvoiceDraftLineResponse>

    /** Before VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly netVnd!: number

    /** VAT rate, percent. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100 })
    readonly vatRatePercent!: number

    /** VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly vatVnd!: number

    /** Total. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly totalVnd!: number

    /** draft. */
    @ApiProperty({ type: String, enum: ["draft"] })
    readonly state!: "draft"

    /** placeholder until the owner's price sheet is loaded. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: InvoiceDraftView["priceSource"]
}

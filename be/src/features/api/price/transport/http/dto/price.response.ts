import { ApiProperty } from "@nestjs/swagger"
import type { PriceView } from "@modules/domain/crm"

/** One price of the table (PLACEHOLDER until the owner's price sheet is loaded). */
export class PriceResponse implements PriceView {
    /** The service class. */
    @ApiProperty({ type: String, enum: ["hosting", "domain", "ssl"] })
    readonly serviceClass!: PriceView["serviceClass"]

    /** The term, months. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 120 })
    readonly termMonths!: number

    /** Before VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly netVnd!: number

    /** VAT rate, percent. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100 })
    readonly vatRatePercent!: number

    /** VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly vatVnd!: number

    /** What the customer pays. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly totalVnd!: number

    /** placeholder until the owner's price sheet is loaded. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: PriceView["priceSource"]
}

/** One page of prices. */
export class PricePageResponse {
    /** The prices of this page. */
    @ApiProperty({ type: PriceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<PriceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

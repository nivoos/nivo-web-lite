import { ApiProperty } from "@nestjs/swagger"
import type { PriceRow } from "../../../application/list-prices.query"

/** One row of the price table (PLACEHOLDER until the owner's price sheet is loaded). */
export class PriceResponse implements PriceRow {
    /** The row's code: what a quote names. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly priceCode!: string

    /** The row's name. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly name!: string

    /** A NEW sale or a renewal. */
    @ApiProperty({ type: String, enum: ["new", "renewal"] })
    readonly kind!: PriceRow["kind"]

    /** The service class, or `website` for a website build. */
    @ApiProperty({ type: String, enum: ["hosting", "domain", "ssl", "website"] })
    readonly serviceClass!: PriceRow["serviceClass"]

    /** The term priced, months; null for a one-time row. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 120, nullable: true })
    readonly termMonths!: number | null

    /** The one-time set-up price. Whole VND before VAT. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly setupVnd!: number

    /** The term's price. Whole VND before VAT. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly netVnd!: number

    /** VAT rate, percent. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100 })
    readonly vatRatePercent!: number

    /** VAT. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly vatVnd!: number

    /** What the customer pays for one. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly totalVnd!: number

    /** The instalments, percents of the total, in order (terms as data). */
    @ApiProperty({ type: "integer", isArray: true, maxItems: 12 })
    readonly instalmentPercents!: ReadonlyArray<number>

    /** placeholder until the owner's price sheet is loaded. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: PriceRow["priceSource"]
}

/** One page of price rows. */
export class PricePageResponse {
    /** The rows of this page. */
    @ApiProperty({ type: PriceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<PriceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

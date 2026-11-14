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

    /** The renewal it drafts, or null for a purchase. */
    @ApiProperty({ type: String, format: "uuid", nullable: true })
    readonly renewalId!: string | null

    /** The purchase it drafts, or null for a renewal. */
    @ApiProperty({ type: String, format: "uuid", nullable: true })
    readonly purchaseId!: string | null

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

    /** draft, or issued once the e-invoice is recorded on it. */
    @ApiProperty({ type: String, enum: ["draft", "issued"] })
    readonly state!: InvoiceDraftView["state"]

    /** placeholder until the owner's price sheet is loaded. */
    @ApiProperty({ type: String, enum: ["placeholder", "price_sheet"] })
    readonly priceSource!: InvoiceDraftView["priceSource"]

    /** The number of the e-invoice issued for the draft, or null while a draft. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly invoiceNo!: string | null

    /** The e-invoice provider's reference of that invoice. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly providerRef!: string | null

    /** The issue date of that invoice. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly issuedOn!: string | null
}

/** A VAT invoice of the workspace. */
export class WorkspaceInvoiceResponse {
    /** The 8-digit number. */
    @ApiProperty({ type: String, maxLength: 8 })
    readonly invoiceNo!: string

    /** Issued on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly issuedOn!: string | null

    /** Amount, whole VND; null when the source has none. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly amountVnd!: number | null

    /** True when the PDF is in the documents folder. */
    @ApiProperty({ type: Boolean })
    readonly hasDocument!: boolean

    /** The customer code the source wrote; null when it wrote none. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null
}

/** One page of the workspace's VAT invoices. */
export class WorkspaceInvoicePageResponse {
    /** The invoices of this page. */
    @ApiProperty({ type: WorkspaceInvoiceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<WorkspaceInvoiceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

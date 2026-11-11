import { ApiProperty } from "@nestjs/swagger"
import type { PayableNoteView, PayableView } from "@modules/domain/crm"

/** A TK331 party (supplier) with its balance and notes. */
export class PayableResponse implements PayableView {
    /** The party code of the books. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly partyCode!: string

    /** The party name as written. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly partyName!: string | null

    /** Closing credit (owed by the enterprise). Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly closingCreditVnd!: number | null

    /** Closing debit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly closingDebitVnd!: number | null

    /** Supplier invoices noted. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly noteCount!: number

    /** The invoice number of the last note. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly lastNoteInvoiceNo!: string | null
}

/** One page of TK331 parties. */
export class PayablePageResponse {
    /** The TK331 parties of this page. */
    @ApiProperty({ type: PayableResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<PayableResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A supplier invoice note. */
export class PayableNoteResponse implements PayableNoteView {
    /** The record id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The party code. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly partyCode!: string

    /** The supplier's invoice number. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly invoiceNo!: string | null

    /** The invoice date. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly issuedOn!: string | null

    /** The e-invoice reference. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly einvoiceRef!: string | null

    /** A short note. */
    @ApiProperty({ type: String, maxLength: 1000, nullable: true })
    readonly note!: string | null

    /** When it was recorded. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly recordedAt!: string
}

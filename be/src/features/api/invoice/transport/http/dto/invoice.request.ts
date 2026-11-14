import { ApiProperty } from "@nestjs/swagger"
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The paid renewal OR the paid purchase to draft the invoice of (exactly one). */
export class CreateInvoiceDraftRequest {
    /** The renewal request (paid, pending_person or renewed). */
    @ApiProperty({ type: String, format: "uuid", required: false, nullable: true })
    @IsOptional()
    @IsUUID()
    @MaxLength(36)
    readonly renewalId: string | null = null

    /** The purchase (paid, pending_person or delivered). */
    @ApiProperty({ type: String, format: "uuid", required: false, nullable: true })
    @IsOptional()
    @IsUUID()
    @MaxLength(36)
    readonly purchaseId: string | null = null
}

/** The path of an invoice draft door. */
export class InvoiceDraftPathRequest {
    /** The draft id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

/** A calendar day, `YYYY-MM-DD`. */
const DAY = /^\d{4}-\d{2}-\d{2}$/u

/** The e-invoice issued for a draft (issued at MISA meInvoice by the Accounting agent; the CRM only records it). */
export class RecordIssuedInvoiceRequest {
    /** The invoice number MISA gave. */
    @ApiProperty({ type: String, maxLength: 40, minLength: 1 })
    @IsString()
    @MaxLength(40)
    @MinLength(1)
    readonly invoiceNo!: string

    /** MISA's reference of the invoice (its transaction id), when it gave one. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly providerRef: string | null = null

    /** The issue date. */
    @ApiProperty({ type: String, format: "date" })
    @IsString()
    @MaxLength(10)
    @Matches(DAY)
    readonly issuedOn!: string
}

/** The query of `invoice.list`: an optional customer code and issue period, and the page. */
export class ListInvoicesRequest extends PageRequest {
    /** Only the invoices whose source names this customer code. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly customerCode: string | null = null

    /** Only the invoices issued on or after this day. */
    @ApiProperty({ type: String, format: "date", maxLength: 10, required: false })
    @IsOptional()
    @MaxLength(10)
    @Matches(DAY)
    readonly issuedFrom: string | null = null

    /** Only the invoices issued on or before this day. */
    @ApiProperty({ type: String, format: "date", maxLength: 10, required: false })
    @IsOptional()
    @MaxLength(10)
    @Matches(DAY)
    readonly issuedTo: string | null = null
}

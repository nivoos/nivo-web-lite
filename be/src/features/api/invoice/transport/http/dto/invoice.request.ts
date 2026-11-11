import { ApiProperty } from "@nestjs/swagger"
import { IsUUID, MaxLength } from "class-validator"

/** The paid renewal to draft the invoice of. */
export class CreateInvoiceDraftRequest {
    /** The renewal request (paid, pending_person or renewed). */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly renewalId!: string
}

/** The path of an invoice draft door. */
export class InvoiceDraftPathRequest {
    /** The draft id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

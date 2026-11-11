import { ApiProperty } from "@nestjs/swagger"
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator"

/** A supplier invoice noted against the party (the amount stays in the e-invoice). */
export class RecordPayableNoteRequest {
    /** The supplier's invoice number. */
    @ApiProperty({ type: String, maxLength: 40, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    @MinLength(1)
    readonly invoiceNo: string | null = null

    /** The invoice date. */
    @ApiProperty({ type: String, format: "date", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^\d{4}-\d{2}-\d{2}$/u)
    readonly issuedOn: string | null = null

    /** The e-invoice reference (lookup id). */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly einvoiceRef: string | null = null

    /** A short note. */
    @ApiProperty({ type: String, maxLength: 1000, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @MinLength(1)
    readonly note: string | null = null
}

/** The path of a payable door. */
export class PartyPathRequest {
    /** The TK331 party code of the books. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1 })
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly partyCode!: string
}

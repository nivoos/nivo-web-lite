import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The overdue list: reference day and page. */
export class ListOverdueRequest extends PageRequest {
    /** The reference day; today in Ho Chi Minh when absent. */
    @ApiProperty({ type: String, format: "date", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^\d{4}-\d{2}-\d{2}$/u)
    readonly asOf: string | null = null
}

/** A notice sent about the receivable. */
export class RecordNoticeRequest {
    /** The channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"] })
    @IsIn(["zalo", "email", "phone"])
    readonly channel!: "zalo" | "email" | "phone"

    /** The channel's message id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly messageRef: string | null = null
}

/** The bank row that proves the payment (no amount: the bank row is the proof). */
export class RecordReceivablePaymentRequest {
    /** The bank transaction's id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly transactionRef!: string
}

/** The path of a receivable door. */
export class ProjectPathRequest {
    /** The project code of the receivable. */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly code!: string
}

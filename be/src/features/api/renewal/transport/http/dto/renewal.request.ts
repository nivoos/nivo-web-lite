import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The customer said yes: the service and the term. */
export class CreateQuoteRequest {
    /** The service code. */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly serviceCode!: string

    /** The term, months (the placeholder table prices 12, 24 and 36). */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 120 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(120)
    readonly termMonths!: number
}

/** The open requests: optional customer and page. */
export class ListOpenRenewalsRequest extends PageRequest {
    /** Only this customer's requests. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly customerCode: string | null = null
}

/** The bank row that proves the payment (no amount: the bank row is the proof). */
export class RecordRenewalPaymentRequest {
    /** The bank transaction's id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly transactionRef!: string
}

/** A person confirms what happened at the provider. */
export class RecordRenewalOutcomeRequest {
    /** renewed or failed. */
    @ApiProperty({ type: String, enum: ["renewed", "failed"] })
    @IsIn(["renewed", "failed"])
    readonly outcome!: "renewed" | "failed"

    /** The new end date (renewed). */
    @ApiProperty({ type: String, format: "date", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^\d{4}-\d{2}-\d{2}$/u)
    readonly newExpiresOn: string | null = null

    /** Who confirms (a person's name). */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly confirmedBy!: string

    /** A short note. */
    @ApiProperty({ type: String, maxLength: 1000, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @MinLength(1)
    readonly note: string | null = null
}

/** The paid renewal request to execute at the provider. */
export class ExecuteRenewalRequest {
    /** The renewal request (must be paid). */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly renewalId!: string

    /** Default true: ask no real provider. */
    @ApiProperty({ type: Boolean, required: false })
    @IsOptional()
    @IsBoolean()
    readonly dryRun: boolean = true
}

/** The path of a renewal door. */
export class RenewalPathRequest {
    /** The renewal request id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

/** The path of the provider renewal door. */
export class RenewalServicePathRequest {
    /** The service code; must be the request's service. */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly code!: string
}

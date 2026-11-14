import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from "class-validator"
import type { RenewalOutcome } from "@modules/domain/crm"
import { PageRequest } from "@modules/platform/openapi"

/** An open renewal state, as `renewal.open.list` filters by it. */
type OpenRenewalState = "awaiting_payment" | "paid" | "pending_person"

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

    /** Only the open requests in this state; absent: every open state. */
    @ApiProperty({ type: String, enum: ["awaiting_payment", "paid", "pending_person"], required: false })
    @IsOptional()
    @IsIn(["awaiting_payment", "paid", "pending_person"])
    readonly state: OpenRenewalState | null = null
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

/** What the provider answered for a paid renewal (the agent renewed at the provider; the CRM only records). */
export class RecordRenewalOutcomeRequest {
    /** renewed, failed, or pending (the provider's answer is pending or unknown: a person follows up). */
    @ApiProperty({ type: String, enum: ["renewed", "failed", "pending"] })
    @IsIn(["renewed", "failed", "pending"])
    readonly outcome!: RenewalOutcome

    /** The provider's reference of the renewal (its order or transaction id), when it gave one. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly providerRef: string | null = null

    /** The new end date (renewed). */
    @ApiProperty({ type: String, format: "date", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^\d{4}-\d{2}-\d{2}$/u)
    readonly newExpiresOn: string | null = null

    /** Who records (the agent's name, or a person's). */
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

/** The path of a renewal door. */
export class RenewalPathRequest {
    /** The renewal request id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

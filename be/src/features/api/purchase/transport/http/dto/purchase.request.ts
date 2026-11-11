import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The channels an enquiry or a follow-up goes by. */
const CHANNELS = ["zalo", "email", "phone", "web", "other"] as const

/** The path of a purchase door. */
export class PurchasePathRequest {
    /** The purchase id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

/** A new enquiry: where it came from, the need, and the contact as said. */
export class CreatePurchaseRequest {
    /** The channel it came by. */
    @ApiProperty({ type: String, enum: CHANNELS })
    @IsIn(CHANNELS)
    readonly channel!: (typeof CHANNELS)[number]

    /** The conversation or mail id it came from; the open purchase of the same channel and source is answered. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly sourceRef!: string

    /** The need as the person said it. */
    @ApiProperty({ type: String, maxLength: 4000, minLength: 1 })
    @IsString()
    @MaxLength(4000)
    @MinLength(1)
    readonly need!: string

    /** The contact's name as said. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly contactName: string | null = null

    /** The contact's phone as said. */
    @ApiProperty({ type: String, maxLength: 40, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    readonly phone: string | null = null

    /** The contact's mail as said. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly email: string | null = null

    /** The domain the need is about, as said. */
    @ApiProperty({ type: String, maxLength: 253, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(253)
    readonly domain: string | null = null

    /** The customer code of the books, when an existing customer asks for something NEW. */
    @ApiProperty({ type: String, maxLength: 80, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    readonly customerCode: string | null = null
}

/** What a purchase update may change: the need, the contact as said, or `state: lost` with a note. */
export class UpdatePurchaseRequest {
    /** The need as now said. */
    @ApiProperty({ type: String, maxLength: 4000, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    readonly need: string | null = null

    /** The contact's name as now said. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly contactName: string | null = null

    /** The contact's phone as now said. */
    @ApiProperty({ type: String, maxLength: 40, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    readonly phone: string | null = null

    /** The contact's mail as now said. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly email: string | null = null

    /** The domain as now said. */
    @ApiProperty({ type: String, maxLength: 253, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(253)
    readonly domain: string | null = null

    /** `lost`: the person does not buy (the only state move this door makes). */
    @ApiProperty({ type: String, enum: ["lost"], required: false, nullable: true })
    @IsOptional()
    @IsIn(["lost"])
    readonly state: "lost" | null = null

    /** Why it was lost. */
    @ApiProperty({ type: String, maxLength: 1000, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly note: string | null = null
}

/** The query of `purchase.open.list`. */
export class ListOpenPurchasesRequest extends PageRequest {
    /** Only the open purchases in this state. */
    @ApiProperty({
        type: String,
        enum: ["enquiry", "quoted", "awaiting_payment", "paid", "pending_person"],
        required: false,
    })
    @IsOptional()
    @IsIn(["enquiry", "quoted", "awaiting_payment", "paid", "pending_person"])
    readonly state: "enquiry" | "quoted" | "awaiting_payment" | "paid" | "pending_person" | null = null

    /** Only the purchase of this conversation or mail id. */
    @ApiProperty({ type: String, maxLength: 200, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly sourceRef: string | null = null
}

/** One item of a quote: a price row, its term, how many. */
export class QuoteItemRequest {
    /** The price row (`price.list`). */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1 })
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly priceCode!: string

    /** The term, months; absent: the row's own term. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 120, required: false, nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(120)
    readonly termMonths: number | null = null

    /** How many; absent: one. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 100, required: false, nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    readonly quantity: number | null = null
}

/** The items of a quote; the CRM computes every amount. */
export class CreatePurchaseQuoteRequest {
    /** What is quoted, one item per price row. */
    @ApiProperty({ type: QuoteItemRequest, isArray: true, minItems: 1, maxItems: 20 })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => QuoteItemRequest)
    readonly items!: ReadonlyArray<QuoteItemRequest>
}

/** One follow-up of a purchase. */
export class RecordFollowUpRequest {
    /** The channel it went by. */
    @ApiProperty({ type: String, enum: CHANNELS })
    @IsIn(CHANNELS)
    readonly channel!: (typeof CHANNELS)[number]

    /** What came of it. */
    @ApiProperty({ type: String, enum: ["sent", "answered", "no_answer", "declined"] })
    @IsIn(["sent", "answered", "no_answer", "declined"])
    readonly outcome!: "sent" | "answered" | "no_answer" | "declined"

    /** The message id on the channel. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly messageRef: string | null = null
}

/** A new customer of the books, for a purchase. */
export class CreateCustomerRequest {
    /** The purchase it is opened for. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly purchaseId!: string

    /** A company or a person. */
    @ApiProperty({ type: String, enum: ["company", "person"] })
    @IsIn(["company", "person"])
    readonly kind!: "company" | "person"

    /** The name as the customer gives it. */
    @ApiProperty({ type: String, maxLength: 300, minLength: 1 })
    @IsString()
    @MaxLength(300)
    @MinLength(1)
    readonly name!: string

    /** The tax id. */
    @ApiProperty({ type: String, maxLength: 20, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    readonly taxId: string | null = null

    /** The address. */
    @ApiProperty({ type: String, maxLength: 500, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    readonly address: string | null = null

    /** The phone. */
    @ApiProperty({ type: String, maxLength: 40, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    readonly phone: string | null = null

    /** The mail. */
    @ApiProperty({ type: String, maxLength: 200, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    readonly email: string | null = null
}

/** The acceptance of the current quote by a customer of the books. */
export class RecordAcceptanceRequest {
    /** The customer of the books it is accepted for. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1 })
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly customerCode!: string

    /** Default true: show what the acceptance would open and write nothing. */
    @ApiProperty({ type: Boolean, required: false })
    @IsOptional()
    @IsBoolean()
    readonly dryRun: boolean = true
}

/** The bank row that proves a purchase's payment (no amount: the bank row is the proof). */
export class RecordPurchasePaymentRequest {
    /** The bank transaction's id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly transactionRef!: string
}

/** A person's outcome of a purchase. */
export class RecordPurchaseOutcomeRequest {
    /** Delivered once paid, or cancelled while open. */
    @ApiProperty({ type: String, enum: ["delivered", "cancelled"] })
    @IsIn(["delivered", "cancelled"])
    readonly outcome!: "delivered" | "cancelled"

    /** The person who confirms it. */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly confirmedBy!: string

    /** A note. */
    @ApiProperty({ type: String, maxLength: 1000, required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    readonly note: string | null = null
}

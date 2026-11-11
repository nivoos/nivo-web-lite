import { ApiProperty } from "@nestjs/swagger"
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** A ticket from a conversation or a mail. */
export class CreateTicketRequest {
    /** The customer, when known. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly customerCode: string | null = null

    /** The services it concerns. */
    @ApiProperty({ type: String, isArray: true, maxItems: 20, required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(120, { each: true })
    readonly serviceCodes: ReadonlyArray<string> = []

    /** The kind. */
    @ApiProperty({ type: String, enum: ["fault", "complaint", "question", "request"] })
    @IsIn(["fault", "complaint", "question", "request"])
    readonly kind!: "fault" | "complaint" | "question" | "request"

    /** The channel it came from. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "chat"] })
    @IsIn(["zalo", "email", "phone", "chat"])
    readonly channel!: "zalo" | "email" | "phone" | "chat"

    /** The conversation or mail id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly sourceRef: string | null = null

    /** One line. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly subject!: string

    /** What the customer reported. */
    @ApiProperty({ type: String, maxLength: 4000 })
    @IsString()
    @MaxLength(4000)
    readonly summary!: string
}

/** The ticket list: optional customer, status and page. */
export class ListTicketsRequest extends PageRequest {
    /** Only this customer's. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly customerCode: string | null = null

    /** Only this status. */
    @ApiProperty({
        type: String,
        enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"],
        required: false,
    })
    @IsOptional()
    @IsIn(["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"])
    readonly status: "open" | "in_progress" | "waiting_customer" | "quoted" | "resolved" | "closed" | null = null
}

/** A note and/or a status change (at least one). */
export class UpdateTicketRequest {
    /** The new status. */
    @ApiProperty({
        type: String,
        enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"],
        required: false,
    })
    @IsOptional()
    @IsIn(["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"])
    readonly status: "open" | "in_progress" | "waiting_customer" | "quoted" | "resolved" | "closed" | null = null

    /** The note. */
    @ApiProperty({ type: String, maxLength: 4000, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    @MinLength(1)
    readonly note: string | null = null

    /** Who writes (a person's or an agent's name). */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly author!: string
}

/** The path of a ticket door. */
export class TicketPathRequest {
    /** The ticket id. */
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    @MaxLength(36)
    readonly id!: string
}

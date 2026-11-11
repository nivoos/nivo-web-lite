import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The renewal list: reference day, window, expired ones, page. */
export class ListExpiringRequest extends PageRequest {
    /** The reference day; today in Ho Chi Minh when absent. */
    @ApiProperty({ type: String, format: "date", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^\d{4}-\d{2}-\d{2}$/u)
    readonly asOf: string | null = null

    /** Window after asOf, days; default 30. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 366, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(366)
    readonly withinDays: number = 30

    /** Include services already past their end date (`true`); default `false`. */
    @ApiProperty({ type: String, enum: ["true", "false"], required: false })
    @IsOptional()
    @IsIn(["true", "false"])
    readonly includeExpired: "true" | "false" = "false"
}

/** A reminder sent about the service (the channel's message id, never the words). */
export class RecordReminderRequest {
    /** The channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"] })
    @IsIn(["zalo", "email", "phone"])
    readonly channel!: "zalo" | "email" | "phone"

    /** What came of it. */
    @ApiProperty({ type: String, enum: ["sent", "quoted", "answered", "declined", "no_answer"] })
    @IsIn(["sent", "quoted", "answered", "declined", "no_answer"])
    readonly outcome!: "sent" | "quoted" | "answered" | "declined" | "no_answer"

    /** The channel's message id. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly messageRef: string | null = null
}

/** The path of a service door. */
export class ServicePathRequest {
    /** The service code `<SITE>-HOST|TM|SSL`. */
    @ApiProperty({ type: String, maxLength: 120, minLength: 1 })
    @IsString()
    @MaxLength(120)
    @MinLength(1)
    readonly code!: string
}

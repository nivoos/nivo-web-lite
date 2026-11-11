import { ApiProperty } from "@nestjs/swagger"
import type { TicketSummaryView, TicketView } from "@modules/domain/crm"

/** A note or a status change. */
export class TicketNoteResponse {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The note. */
    @ApiProperty({ type: String, maxLength: 4000, nullable: true })
    readonly body!: string | null

    /** The status before a change. */
    @ApiProperty({
        type: String,
        enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"],
        nullable: true,
    })
    readonly statusFrom!: TicketSummaryView["status"] | null

    /** The status after a change. */
    @ApiProperty({
        type: String,
        enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"],
        nullable: true,
    })
    readonly statusTo!: TicketSummaryView["status"] | null

    /** Who wrote it. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly author!: string

    /** When. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly createdAt!: string
}

/** A ticket as a list shows it. */
export class TicketSummaryResponse implements TicketSummaryView {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The customer, when known. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The services it concerns. */
    @ApiProperty({ type: String, isArray: true, maxItems: 20 })
    readonly serviceCodes!: ReadonlyArray<string>

    /** The kind. */
    @ApiProperty({ type: String, enum: ["fault", "complaint", "question", "request"] })
    readonly kind!: TicketSummaryView["kind"]

    /** The status. */
    @ApiProperty({ type: String, enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"] })
    readonly status!: TicketSummaryView["status"]

    /** The channel it came from. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "chat"] })
    readonly channel!: TicketSummaryView["channel"]

    /** The conversation or mail id. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly sourceRef!: string | null

    /** One line. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly subject!: string

    /** When it was opened. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly openedAt!: string

    /** When it was closed. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly closedAt!: string | null
}

/** One ticket with its summary and notes. */
export class TicketResponse implements TicketView {
    /** The id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The customer, when known. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The services it concerns. */
    @ApiProperty({ type: String, isArray: true, maxItems: 20 })
    readonly serviceCodes!: ReadonlyArray<string>

    /** The kind. */
    @ApiProperty({ type: String, enum: ["fault", "complaint", "question", "request"] })
    readonly kind!: TicketView["kind"]

    /** The status. */
    @ApiProperty({ type: String, enum: ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"] })
    readonly status!: TicketView["status"]

    /** The channel it came from. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone", "chat"] })
    readonly channel!: TicketView["channel"]

    /** The conversation or mail id. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly sourceRef!: string | null

    /** One line. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly subject!: string

    /** When it was opened. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly openedAt!: string

    /** When it was closed. */
    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readonly closedAt!: string | null

    /** What the customer reported. */
    @ApiProperty({ type: String, maxLength: 4000 })
    readonly summary!: string

    /** Its notes, oldest first. */
    @ApiProperty({ type: TicketNoteResponse, isArray: true, maxItems: 100 })
    readonly notes!: ReadonlyArray<TicketNoteResponse>
}

/** One page of tickets. */
export class TicketPageResponse {
    /** The tickets of this page. */
    @ApiProperty({ type: TicketSummaryResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<TicketSummaryResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

import { ApiProperty } from "@nestjs/swagger"
import type { ExpiringServiceView, ReminderView, ServiceStatusView } from "@modules/domain/crm"

/** A service on the renewal list with the facts to decide on (no verdict). */
export class ExpiringServiceResponse implements ExpiringServiceView {
    /** The service code. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly code!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** The website's domain. */
    @ApiProperty({ type: String, maxLength: 253, nullable: true })
    readonly domain!: string | null

    /** The service class. */
    @ApiProperty({ type: String, enum: ["hosting", "domain", "ssl"] })
    readonly serviceClass!: ExpiringServiceView["serviceClass"]

    /** tino, inet, azwebsite, manual or null. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly provider!: string | null

    /** The mapped status. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly status!: string

    /** The status as written. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly statusText!: string | null

    /** Started on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly startsOn!: string | null

    /** Ends on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly expiresOn!: string | null

    /** Where the end date came from (never renew on `estimated` without a provider check). */
    @ApiProperty({ type: String, enum: ["provider", "estimated", "invoice", "confirmed", "none"] })
    readonly expirySource!: ExpiringServiceView["expirySource"]

    /** Days from asOf to the end date (negative when expired). */
    @ApiProperty({ type: "integer", minimum: -100000, maximum: 100000 })
    readonly daysLeft!: number

    /** True when the customer has a phone, an e-mail or a linked contact. */
    @ApiProperty({ type: Boolean })
    readonly reachable!: boolean

    /** The Ho Chi Minh day of the last reminder. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly lastReminderOn!: string | null

    /** Reminders recorded. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly reminderCount!: number

    /** True when the last reminder still waits for the customer's answer (outcome sent or quoted). */
    @ApiProperty({ type: Boolean })
    readonly openReminder!: boolean

    /** The open renewal request, when there is one. */
    @ApiProperty({ type: String, format: "uuid", nullable: true })
    readonly openRenewalId!: string | null
}

/** One page of services ending soon. */
export class ExpiringServicePageResponse {
    /** The services ending soon of this page. */
    @ApiProperty({ type: ExpiringServiceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<ExpiringServiceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A service's state as the CRM's books hold it (no provider is asked). */
export class ServiceStatusResponse implements ServiceStatusView {
    /** The service. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly serviceCode!: string

    /** The status the books hold. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly status!: string

    /** active or expired by the stored end date; unknown without one. */
    @ApiProperty({ type: String, enum: ["active", "expired", "unknown"] })
    readonly state!: ServiceStatusView["state"]

    /** The end date the books hold. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly expiresOn!: string | null

    /** Where that end date came from. */
    @ApiProperty({ type: String, enum: ["provider", "estimated", "invoice", "confirmed", "none"] })
    readonly expirySource!: ServiceStatusView["expirySource"]
}

/** A reminder recorded. */
export class ReminderResponse implements ReminderView {
    /** The record id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The service. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly serviceCode!: string

    /** The channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"] })
    readonly channel!: ReminderView["channel"]

    /** What came of it. */
    @ApiProperty({ type: String, enum: ["sent", "quoted", "answered", "declined", "no_answer"] })
    readonly outcome!: ReminderView["outcome"]

    /** The channel's message id. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly messageRef!: string | null

    /** When it was recorded as sent. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly sentAt!: string
}

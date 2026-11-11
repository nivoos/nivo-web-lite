import { ApiProperty } from "@nestjs/swagger"
import type { NoticeView, ReceivablePaymentView, ReceivableView } from "@modules/domain/crm"

/** A real receivable (a project's collection) with its notice facts. */
export class ReceivableResponse implements ReceivableView {
    /** The project code. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly projectCode!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The contract reference as written. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly contractRef!: string | null

    /** Total. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly totalVnd!: number

    /** Collected. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly collectedVnd!: number

    /** Remaining. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly remainingVnd!: number

    /** Due on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly dueOn!: string | null

    /** The project's state as written. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly projectState!: string | null

    /** The Ho Chi Minh day of the last notice. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly lastNoticeOn!: string | null

    /** Notices recorded. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly noticeCount!: number

    /** Payments recorded by bank reference. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly paymentCount!: number
}

/** One page of overdue receivables. */
export class ReceivablePageResponse {
    /** The overdue receivables of this page. */
    @ApiProperty({ type: ReceivableResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<ReceivableResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A notice recorded. */
export class NoticeResponse implements NoticeView {
    /** The record id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The project code. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly projectCode!: string

    /** The channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"] })
    readonly channel!: NoticeView["channel"]

    /** The channel's message id. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly messageRef!: string | null

    /** When it was recorded as sent. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly sentAt!: string
}

/** A payment recorded. */
export class ReceivablePaymentResponse implements ReceivablePaymentView {
    /** The record id. */
    @ApiProperty({ type: String, format: "uuid" })
    readonly id!: string

    /** The project code. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly projectCode!: string

    /** The bank transaction's id. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly transactionRef!: string

    /** When it was recorded. */
    @ApiProperty({ type: String, format: "date-time" })
    readonly recordedAt!: string
}

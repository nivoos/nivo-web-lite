import { Column, Entity } from "typeorm"
import type { ReminderChannel } from "../../service.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_receivable_notices" })
/** One notice sent about a receivable: channel and message reference, never the words. Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class ReceivableNoticeEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The receivable. */
    @Column({ name: "receivable_id", type: "uuid" })
    receivableId!: string

    /** zalo, email or phone. */
    @Column({ name: "channel", type: "text" })
    channel!: ReminderChannel

    /** The message id of the channel. */
    @Column({ name: "message_ref", type: "text", nullable: true })
    messageRef!: string | null

    /** When it was sent. */
    @Column({ name: "sent_at", type: "timestamptz" })
    sentAt!: Date

    /** The caller's replay key (Idempotency-Key). */
    @Column({ name: "request_key", type: "text" })
    requestKey!: string

    /** sha256 of the canonical request the key was first used with. */
    @Column({ name: "request_hash", type: "text" })
    requestHash!: string
}

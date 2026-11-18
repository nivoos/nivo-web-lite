import { Column, Entity } from "typeorm"
import type { ReminderChannel, ReminderOutcome } from "../../service.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_service_reminders" })
/** One reminder sent about a service: the channel and message reference, never the words. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ServiceReminderEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The service. */
    @Column({ name: "crm_service_id", type: "uuid" })
    serviceId!: string

    /** zalo, email or phone. */
    @Column({ name: "channel", type: "text" })
    channel!: ReminderChannel

    /** The message id of the channel. */
    @Column({ name: "message_ref", type: "text", nullable: true })
    messageRef!: string | null

    /** When it was sent. */
    @Column({ name: "sent_at", type: "timestamptz" })
    sentAt!: Date

    /** sent, quoted, answered, declined or no_answer (0005). */
    @Column({ name: "outcome", type: "text" })
    outcome!: ReminderOutcome

    /** The caller's replay key (0005; null before). */
    @Column({ name: "request_key", type: "text", nullable: true })
    requestKey!: string | null

    /** sha256 of the canonical request (0005). */
    @Column({ name: "request_hash", type: "text", nullable: true })
    requestHash!: string | null
}

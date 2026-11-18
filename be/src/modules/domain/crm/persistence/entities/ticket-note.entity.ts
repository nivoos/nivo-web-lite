import { Column, Entity } from "typeorm"
import type { TicketStatus } from "../../ticket.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_ticket_notes" })
/** One note or status change on a ticket. Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class TicketNoteEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The ticket. */
    @Column({ name: "crm_ticket_id", type: "uuid" })
    ticketId!: string

    /** The note. */
    @Column({ name: "body", type: "text", nullable: true })
    body!: string | null

    /** The status before a change. */
    @Column({ name: "status_from", type: "text", nullable: true })
    statusFrom!: TicketStatus | null

    /** The status after a change. */
    @Column({ name: "status_to", type: "text", nullable: true })
    statusTo!: TicketStatus | null

    /** Who wrote it (a person's or an agent's name). */
    @Column({ name: "author", type: "text" })
    author!: string

    /** The caller's replay key (Idempotency-Key). */
    @Column({ name: "request_key", type: "text" })
    requestKey!: string

    /** sha256 of the canonical request the key was first used with. */
    @Column({ name: "request_hash", type: "text" })
    requestHash!: string
}

import { Column, Entity } from "typeorm"
import type { TicketChannel, TicketKind, TicketStatus } from "../../ticket.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_tickets" })
/** One support ticket. Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class TicketEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The customer, when known. */
    @Column({ name: "crm_customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** The services it concerns. */
    @Column({ name: "service_ids", type: "uuid", array: true })
    serviceIds!: Array<string>

    /** fault, complaint, question or request. */
    @Column({ name: "kind", type: "text" })
    kind!: TicketKind

    /** open, in_progress, waiting_customer, quoted, resolved or closed. */
    @Column({ name: "status", type: "text" })
    status!: TicketStatus

    /** zalo, email, phone or chat. */
    @Column({ name: "channel", type: "text" })
    channel!: TicketChannel

    /** The conversation or mail id it came from. */
    @Column({ name: "source_ref", type: "text", nullable: true })
    sourceRef!: string | null

    /** One line. */
    @Column({ name: "subject", type: "text" })
    subject!: string

    /** What the customer reported. */
    @Column({ name: "summary", type: "text" })
    summary!: string

    /** When it was opened. */
    @Column({ name: "opened_at", type: "timestamptz" })
    openedAt!: Date

    /** When it was closed. */
    @Column({ name: "closed_at", type: "timestamptz", nullable: true })
    closedAt!: Date | null

    /** The caller's replay key (Idempotency-Key). */
    @Column({ name: "request_key", type: "text" })
    requestKey!: string

    /** sha256 of the canonical request the key was first used with. */
    @Column({ name: "request_hash", type: "text" })
    requestHash!: string
}

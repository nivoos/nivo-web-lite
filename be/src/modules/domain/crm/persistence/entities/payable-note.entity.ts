import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_payable_notes" })
/** One supplier invoice noted against a TK331 party. Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class PayableNoteEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The TK331 party code of the books. */
    @Column({ name: "party_code", type: "text" })
    partyCode!: string

    /** The supplier's invoice number. */
    @Column({ name: "invoice_no", type: "text", nullable: true })
    invoiceNo!: string | null

    /** The invoice date. */
    @Column({ name: "issued_on", type: "date", nullable: true })
    issuedOn!: string | null

    /** The e-invoice reference (lookup id). */
    @Column({ name: "einvoice_ref", type: "text", nullable: true })
    einvoiceRef!: string | null

    /** A short note. */
    @Column({ name: "note", type: "text", nullable: true })
    note!: string | null

    /** When it was recorded. */
    @Column({ name: "recorded_at", type: "timestamptz" })
    recordedAt!: Date

    /** The caller's replay key (Idempotency-Key). */
    @Column({ name: "request_key", type: "text" })
    requestKey!: string

    /** sha256 of the canonical request the key was first used with. */
    @Column({ name: "request_hash", type: "text" })
    requestHash!: string
}

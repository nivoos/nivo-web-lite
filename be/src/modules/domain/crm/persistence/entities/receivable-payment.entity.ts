import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_receivable_payments" })
/** One payment recorded against a receivable by the bank row's reference (no amount). Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class ReceivablePaymentEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The receivable. */
    @Column({ name: "receivable_id", type: "uuid" })
    receivableId!: string

    /** The bank row's id that proves the payment. */
    @Column({ name: "transaction_ref", type: "text" })
    transactionRef!: string

    /** When it was recorded. */
    @Column({ name: "recorded_at", type: "timestamptz" })
    recordedAt!: Date
}

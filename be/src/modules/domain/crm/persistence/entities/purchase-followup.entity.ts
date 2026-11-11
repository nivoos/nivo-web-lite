import { Column, Entity } from "typeorm"
import type { FollowUpOutcome, PurchaseChannel } from "../../purchase.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_purchase_followups" })
/** One follow-up of a purchase, at most one a day (its key is `<purchase>:<day>`). */
export class PurchaseFollowupEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The purchase. */
    @Column({ name: "purchase_id", type: "uuid" })
    purchaseId!: string

    /** The day of the follow-up (Asia/Ho_Chi_Minh). */
    @Column({ name: "day", type: "date" })
    day!: string

    /** The channel it went by. */
    @Column({ name: "channel", type: "text" })
    channel!: PurchaseChannel

    /** What came of it. */
    @Column({ name: "outcome", type: "text" })
    outcome!: FollowUpOutcome

    /** The message id on the channel, if any. */
    @Column({ name: "message_ref", type: "text", nullable: true })
    messageRef!: string | null
}

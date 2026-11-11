import { Column, Entity } from "typeorm"
import type { ContactChannel } from "../../customer.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_contacts" })
/** A contact person of a customer (none in the source today). Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ContactEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The customer. */
    @Column({ name: "customer_id", type: "uuid" })
    customerId!: string

    /** The person's name. */
    @Column({ name: "name", type: "text" })
    name!: string

    /** The phone number. */
    @Column({ name: "phone", type: "text", nullable: true })
    phone!: string | null

    /** The e-mail address. */
    @Column({ name: "email", type: "text", nullable: true })
    email!: string | null

    /** The Zalo id, once the person wrote to the OA. */
    @Column({ name: "zalo_id", type: "text", nullable: true })
    zaloId!: string | null

    /** zalo, email or phone. */
    @Column({ name: "preferred_channel", type: "text", nullable: true })
    preferredChannel!: ContactChannel | null
}

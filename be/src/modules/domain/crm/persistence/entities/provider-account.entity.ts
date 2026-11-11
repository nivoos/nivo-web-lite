import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_provider_accounts" })
/** One account of the enterprise at a provider, with the provider's mode. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ProviderAccountEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** tino, inet, azwebsite or manual. */
    @Column({ name: "provider", type: "text" })
    provider!: string

    /** The account's label. */
    @Column({ name: "label", type: "text" })
    label!: string

    /** dry_run (the default) or live; only the owner flips it. */
    @Column({ name: "mode", type: "text" })
    mode!: string

    /** The plugin the data repository names for the provider; null for an account the CRM made itself. */
    @Column({ name: "plugin", type: "text", nullable: true })
    plugin!: string | null
}

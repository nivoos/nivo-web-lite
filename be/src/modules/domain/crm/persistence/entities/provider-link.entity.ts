import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_provider_links" })
/** A service at a provider account, with the provider-side id when known. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ProviderLinkEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The service. */
    @Column({ name: "service_id", type: "uuid" })
    serviceId!: string

    /** The provider account. */
    @Column({ name: "account_id", type: "uuid" })
    accountId!: string

    /** The provider-side id. */
    @Column({ name: "external_id", type: "text", nullable: true })
    externalId!: string | null
}

import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_service_credentials" })
/** One service credential of one workspace: the bearer `<id>.<secret>` resolves to it; only the secret's sha256 is stored. */
export class ServiceCredentialEntity extends UuidAbstractEntity {
    /** The one enterprise workspace the credential acts for; it scopes every query of a call. */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** What the credential is for (the NIVO connection it was handed to), shown when listing. */
    @Column({ name: "label", type: "text" })
    label!: string

    /** The hex sha256 of the secret part; the secret itself is shown once at issue and never stored. */
    @Column({ name: "secret_sha256", type: "text" })
    secretSha256!: string

    /** When the credential was revoked; a revoked credential is refused. */
    @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
    revokedAt!: Date | null
}

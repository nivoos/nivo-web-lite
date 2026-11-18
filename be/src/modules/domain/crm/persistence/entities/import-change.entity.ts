import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_import_changes" })
/** The values one changed source row replaced, per run. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ImportChangeEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The run. */
    @Column({ name: "crm_import_run_id", type: "uuid" })
    importRunId!: string

    /** The entity. */
    @Column({ name: "entity", type: "text" })
    entity!: string

    /** The natural key of the row. */
    @Column({ name: "entity_key", type: "text" })
    entityKey!: string

    /** The values replaced. */
    @Column({ name: "before", type: "jsonb" })
    before!: object

    /** The values written. */
    @Column({ name: "after", type: "jsonb" })
    after!: object
}

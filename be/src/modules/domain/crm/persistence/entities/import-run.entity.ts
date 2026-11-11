import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_import_runs" })
/** One executed import run. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ImportRunEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The imported folder's name (not its path). */
    @Column({ name: "source_label", type: "text" })
    sourceLabel!: string

    /** When it started. */
    @Column({ name: "started_at", type: "timestamptz" })
    startedAt!: Date

    /** When it finished. */
    @Column({ name: "finished_at", type: "timestamptz", nullable: true })
    finishedAt!: Date | null

    /** The counts it reported. */
    @Column({ name: "counts", type: "jsonb" })
    counts!: object
}

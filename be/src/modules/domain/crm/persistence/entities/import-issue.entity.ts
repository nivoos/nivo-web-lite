import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_import_issues" })
/** One source row or cell the import could not take, with its raw cells. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ImportIssueEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The source file. */
    @Column({ name: "source_file", type: "text" })
    sourceFile!: string

    /** The sheet. */
    @Column({ name: "source_sheet", type: "text" })
    sourceSheet!: string

    /** The 1-based row. */
    @Column({ name: "source_row", type: "integer" })
    sourceRow!: number

    /** The field, empty for the whole row. */
    @Column({ name: "field", type: "text" })
    field!: string

    /** The reason code. */
    @Column({ name: "reason", type: "text" })
    reason!: string

    /** rejected or warning. */
    @Column({ name: "severity", type: "text" })
    severity!: string

    /** The entity the row was for. */
    @Column({ name: "entity", type: "text" })
    entity!: string

    /** The raw cells (database only). */
    @Column({ name: "raw", type: "jsonb" })
    raw!: object

    /** The run that last met it. */
    @Column({ name: "last_import_run_id", type: "uuid", nullable: true })
    lastImportRunId!: string | null
}

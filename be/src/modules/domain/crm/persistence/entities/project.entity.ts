import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_projects" })
/** One website build, keyed by its project code, with the money the index joined to it. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ProjectEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The project code (`<SITE>-WEB`). */
    @Column({ name: "code", type: "text" })
    code!: string

    /** The customer. */
    @Column({ name: "customer_id", type: "uuid" })
    customerId!: string

    /** The website, when the project name is a domain. */
    @Column({ name: "website_id", type: "uuid", nullable: true })
    websiteId!: string | null

    /** The project or website name. */
    @Column({ name: "name", type: "text" })
    name!: string

    /** The contract number the list names. */
    @Column({ name: "contract_no", type: "text", nullable: true })
    contractNo!: string | null

    /** The source's text of the contract's state. */
    @Column({ name: "contract_state", type: "text", nullable: true })
    contractState!: string | null

    /** The value incl. VAT, VND. */
    @Column({ name: "value_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    valueVnd!: number | null

    /** Collected, VND. */
    @Column({ name: "collected_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    collectedVnd!: number | null

    /** Remaining, VND. */
    @Column({ name: "remaining_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    remainingVnd!: number | null

    /** The start date. */
    @Column({ name: "starts_on", type: "date", nullable: true })
    startsOn!: string | null

    /** The end date. */
    @Column({ name: "ends_on", type: "date", nullable: true })
    endsOn!: string | null

    /** The source's text of the state. */
    @Column({ name: "status_text", type: "text", nullable: true })
    statusText!: string | null

    /** The source's note. */
    @Column({ name: "note", type: "text", nullable: true })
    note!: string | null

    /** The source file, relative to the imported folder. */
    @Column({ name: "source_file", type: "text" })
    sourceFile!: string

    /** The sheet of the source file, empty for a file that is not a workbook. */
    @Column({ name: "source_sheet", type: "text" })
    sourceSheet!: string

    /** The 1-based row of the sheet (0 for a file). */
    @Column({ name: "source_row", type: "integer" })
    sourceRow!: number

    /** The sha256 of what the import wrote from that row; an unchanged hash is not written again. */
    @Column({ name: "source_hash", type: "text" })
    sourceHash!: string

    /** The import run that last wrote the row. */
    @Column({ name: "last_import_run_id", type: "uuid", nullable: true })
    lastImportRunId!: string | null
}

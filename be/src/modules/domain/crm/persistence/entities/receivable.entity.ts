import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_receivables" })
/** One real receivable of a project in progress, keyed by its project code. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ReceivableEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The project code. */
    @Column({ name: "project_code", type: "text" })
    projectCode!: string

    /** The project, when the list knows it. */
    @Column({ name: "crm_project_id", type: "uuid", nullable: true })
    projectId!: string | null

    /** The project's customer. */
    @Column({ name: "crm_customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** The contract the row names. */
    @Column({ name: "contract_ref", type: "text", nullable: true })
    contractRef!: string | null

    /** The total incl. VAT, VND. */
    @Column({ name: "total_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    totalVnd!: number | null

    /** Collected, VND. */
    @Column({ name: "collected_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    collectedVnd!: number | null

    /** Remaining, VND. */
    @Column({ name: "remaining_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    remainingVnd!: number | null

    /** When the remainder is due; not in the source today. */
    @Column({ name: "due_on", type: "date", nullable: true })
    dueOn!: string | null

    /** Whether the remainder is invoiced, as written. */
    @Column({ name: "invoiced_note", type: "text", nullable: true })
    invoicedNote!: string | null

    /** The project's state, as written. */
    @Column({ name: "project_state", type: "text", nullable: true })
    projectState!: string | null

    /** The sales person in charge, as written. */
    @Column({ name: "sales_owner", type: "text", nullable: true })
    salesOwner!: string | null

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

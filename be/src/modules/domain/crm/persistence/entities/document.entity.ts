import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_documents" })
/** One document of a customer folder: a reference (path, kind, number), never the content. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class DocumentEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The path relative to the imported folder. */
    @Column({ name: "path", type: "text" })
    path!: string

    /** The customer whose folder holds it. */
    @Column({ name: "customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** invoice, invoice_replacement, contract, quote, minutes, note or other. */
    @Column({ name: "kind", type: "text" })
    kind!: string

    /** The invoice number its name carries. */
    @Column({ name: "invoice_no", type: "text", nullable: true })
    invoiceNo!: string | null

    /** The contract number its name carries. */
    @Column({ name: "contract_no", type: "text", nullable: true })
    contractNo!: string | null

    /** The file name. */
    @Column({ name: "file_name", type: "text" })
    fileName!: string

    /** The size, bytes. */
    @Column({ name: "size_bytes", type: "bigint", transformer: bigintNumberTransformer })
    sizeBytes!: number

    /** The sha256 of the file (hex), as the documents index records it; null for a row the index did not hash. */
    @Column({ name: "sha256", type: "text", nullable: true })
    sha256!: string | null

    /** The object key of the original in the app's private storage, `<workspaceId>/documents/<sha256>`; null until uploaded. */
    @Column({ name: "storage_key", type: "text", nullable: true })
    storageKey!: string | null

    /** When the original was stored; null until uploaded. */
    @Column({ name: "stored_at", type: "timestamptz", nullable: true })
    storedAt!: Date | null

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

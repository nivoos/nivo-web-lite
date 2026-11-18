import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_invoices" })
/** One VAT invoice the enterprise issued, keyed by its number. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class InvoiceEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The invoice number, eight digits. */
    @Column({ name: "invoice_no", type: "text" })
    invoiceNo!: string

    /** The customer the ledger or the folder names. */
    @Column({ name: "crm_customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** The issue date from the ledger. */
    @Column({ name: "issued_on", type: "date", nullable: true })
    issuedOn!: string | null

    /** The total of its ledger lines (revenue + VAT), VND. */
    @Column({ name: "amount_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    amountVnd!: number | null

    /** The stored PDF, relative path. */
    @Column({ name: "document_path", type: "text", nullable: true })
    documentPath!: string | null

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

    /** The customer code the source wrote for the invoice, kept even when no customer matches it (a soft reference). */
    @Column({ name: "customer_code", type: "text", nullable: true })
    customerCode!: string | null
}

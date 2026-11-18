import { Column, Entity } from "typeorm"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_websites" })
/** A website of a customer, keyed by its lower-case domain. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class WebsiteEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The domain, lower case. */
    @Column({ name: "domain", type: "text" })
    domain!: string

    /** The customer the first service of the domain names. */
    @Column({ name: "crm_customer_id", type: "uuid" })
    customerId!: string

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

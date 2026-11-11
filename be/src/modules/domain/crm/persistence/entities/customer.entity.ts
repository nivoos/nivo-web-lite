import { Column, Entity } from "typeorm"
import type { CustomerKind } from "../../customer.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_customers" })
/** One customer of an enterprise workspace, keyed by its code as the source writes it. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class CustomerEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The customer code (opaque text, never parsed). */
    @Column({ name: "code", type: "text" })
    code!: string

    /** company, person, unknown (the source leaves it empty) or placeholder (UNASSIGNED). */
    @Column({ name: "kind", type: "text" })
    kind!: CustomerKind

    /** The customer's name as the source writes it. */
    @Column({ name: "name", type: "text" })
    name!: string

    /** The tax id or citizen id. */
    @Column({ name: "tax_id", type: "text", nullable: true })
    taxId!: string | null

    /** The address. */
    @Column({ name: "address", type: "text", nullable: true })
    address!: string | null

    /** The phone number. */
    @Column({ name: "phone", type: "text", nullable: true })
    phone!: string | null

    /** The e-mail address. */
    @Column({ name: "email", type: "text", nullable: true })
    email!: string | null

    /** The customer's folder in the imported tree, relative. */
    @Column({ name: "folder_path", type: "text", nullable: true })
    folderPath!: string | null

    /** False when neither a phone nor an e-mail is known (a renewal cannot ask). */
    @Column({ name: "reachable", type: "boolean" })
    reachable!: boolean

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

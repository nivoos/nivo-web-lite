import { Column, Entity } from "typeorm"
import type { ExpirySource, ServiceClass } from "../../service.contracts"
import { UuidAbstractEntity } from "./uuid-abstract.entity"

@Entity({ name: "crm_services" })
/** One recurring service (domain, hosting, SSL), keyed by its project code. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ServiceEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The project code of the service (`<SITE>-<HOST|TM|SSL>`). */
    @Column({ name: "code", type: "text" })
    code!: string

    /** The customer (UNASSIGNED when the source names an unknown code). */
    @Column({ name: "customer_id", type: "uuid" })
    customerId!: string

    /** The website, when the service name is a domain. */
    @Column({ name: "website_id", type: "uuid", nullable: true })
    websiteId!: string | null

    /** hosting, domain or ssl. */
    @Column({ name: "service_class", type: "text" })
    serviceClass!: ServiceClass

    /** tino, inet, azwebsite or manual; null when the source names none. */
    @Column({ name: "provider", type: "text", nullable: true })
    provider!: string | null

    /** The mapped state (crm.services status check). */
    @Column({ name: "status", type: "text" })
    status!: string

    /** The source's own text of the state. */
    @Column({ name: "status_text", type: "text", nullable: true })
    statusText!: string | null

    /** The start date (YYYY-MM-DD). */
    @Column({ name: "starts_on", type: "date", nullable: true })
    startsOn!: string | null

    /** The end date (YYYY-MM-DD). */
    @Column({ name: "expires_on", type: "date", nullable: true })
    expiresOn!: string | null

    /** provider, estimated, invoice, confirmed or none. */
    @Column({ name: "expiry_source", type: "text" })
    expirySource!: ExpirySource

    /** The source's own text of where the end date came from. */
    @Column({ name: "expiry_basis", type: "text", nullable: true })
    expiryBasis!: string | null

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

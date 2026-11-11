import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_contracts" })
/** One contract of the register, keyed by its number as written. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class ContractEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The contract number. */
    @Column({ name: "contract_no", type: "text" })
    contractNo!: string

    /** sale, purchase, labour, nda, dpa or other. */
    @Column({ name: "kind", type: "text" })
    kind!: string

    /** The partner as written. */
    @Column({ name: "partner_name", type: "text", nullable: true })
    partnerName!: string | null

    /** The customer, when the partner matches one exactly. */
    @Column({ name: "customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** What the contract is for. */
    @Column({ name: "content", type: "text", nullable: true })
    content!: string | null

    /** The value before VAT, VND. */
    @Column({ name: "value_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    valueVnd!: number | null

    /** The signing date. */
    @Column({ name: "signed_on", type: "date", nullable: true })
    signedOn!: string | null

    /** The effective date. */
    @Column({ name: "effective_on", type: "date", nullable: true })
    effectiveOn!: string | null

    /** The expiry date. */
    @Column({ name: "expires_on", type: "date", nullable: true })
    expiresOn!: string | null

    /** Whether it renews by itself (Y/N); null when not written. */
    @Column({ name: "auto_renew", type: "boolean", nullable: true })
    autoRenew!: boolean | null

    /** The end of the warranty. */
    @Column({ name: "warranty_until", type: "date", nullable: true })
    warrantyUntil!: string | null

    /** The person in charge at the enterprise. */
    @Column({ name: "owner_name", type: "text", nullable: true })
    ownerName!: string | null

    /** The source's text of the state. */
    @Column({ name: "status_text", type: "text", nullable: true })
    statusText!: string | null

    /** Where the signed copy is kept. */
    @Column({ name: "storage_ref", type: "text", nullable: true })
    storageRef!: string | null

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

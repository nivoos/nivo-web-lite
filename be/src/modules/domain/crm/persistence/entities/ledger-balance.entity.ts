import { Column, Entity } from "typeorm"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_ledger_balances" })
/** One account balance of the books for one party (TK131 customer, TK331 supplier). Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class LedgerBalanceEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** 131 or 331. */
    @Column({ name: "account", type: "text" })
    account!: string

    /** The party's code in the books. */
    @Column({ name: "party_code", type: "text" })
    partyCode!: string

    /** The party's name in the books. */
    @Column({ name: "party_name", type: "text", nullable: true })
    partyName!: string | null

    /** The customer, when the code is a customer code. */
    @Column({ name: "customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** Opening debit, VND. */
    @Column({ name: "opening_debit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    openingDebitVnd!: number | null

    /** Opening credit, VND. */
    @Column({ name: "opening_credit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    openingCreditVnd!: number | null

    /** Debit over the period, VND. */
    @Column({ name: "debit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    debitVnd!: number | null

    /** Credit over the period, VND. */
    @Column({ name: "credit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    creditVnd!: number | null

    /** Closing debit, VND. */
    @Column({ name: "closing_debit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    closingDebitVnd!: number | null

    /** Closing credit, VND. */
    @Column({ name: "closing_credit_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    closingCreditVnd!: number | null

    /** The ledger's note. */
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

import { Column, Entity } from "typeorm"
import type { PriceSource } from "../../renewal.contracts"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

/** One line of an invoice draft as stored. */
export interface InvoiceDraftLineValue {
    /** What is invoiced. */
    readonly description: string
    /** How many. */
    readonly quantity: number
    /** Price of one, whole VND before VAT. */
    readonly unitPriceVnd: number
    /** quantity x unit price. */
    readonly amountVnd: number
}

@Entity({ name: "crm_invoice_drafts" })
/** The invoice draft of one renewal (data only). Mapped from db/migrations 0005; id, created_at and updated_at come from UuidAbstractEntity. */
export class InvoiceDraftEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The renewal request. */
    @Column({ name: "renewal_id", type: "uuid" })
    renewalId!: string

    /** The customer. */
    @Column({ name: "customer_id", type: "uuid" })
    customerId!: string

    /** The lines. */
    @Column({ name: "lines", type: "jsonb" })
    lines!: ReadonlyArray<InvoiceDraftLineValue>

    /** Amount before VAT, whole VND. */
    @Column({ name: "net_vnd", type: "bigint", transformer: bigintNumberTransformer })
    netVnd!: number

    /** VAT rate, percent. */
    @Column({ name: "vat_rate_percent", type: "integer" })
    vatRatePercent!: number

    /** VAT, whole VND. */
    @Column({ name: "vat_vnd", type: "bigint", transformer: bigintNumberTransformer })
    vatVnd!: number

    /** Total, whole VND. */
    @Column({ name: "total_vnd", type: "bigint", transformer: bigintNumberTransformer })
    totalVnd!: number

    /** draft. */
    @Column({ name: "state", type: "text" })
    state!: string

    /** placeholder or price_sheet. */
    @Column({ name: "price_source", type: "text" })
    priceSource!: PriceSource
}

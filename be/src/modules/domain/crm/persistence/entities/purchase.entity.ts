import { Column, Entity } from "typeorm"
import type { PurchaseChannel, PurchaseLineValue, PurchaseState } from "../../purchase.contracts"
import type { PriceSource } from "../../renewal.contracts"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_purchases" })
/** One NEW sale, from the enquiry to delivery (twin of a renewal request); id, created_at and updated_at come from UuidAbstractEntity. */
export class PurchaseEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The purchase's own code, `MUA-` + 8 characters: its natural key in the books and the data repository. */
    @Column({ name: "code", type: "text" })
    code!: string

    /** Where the sale stands. */
    @Column({ name: "state", type: "text" })
    state!: PurchaseState

    /** The channel the enquiry came by. */
    @Column({ name: "channel", type: "text" })
    channel!: PurchaseChannel

    /** The conversation or mail id the enquiry came from; one OPEN purchase per channel and source. */
    @Column({ name: "source_ref", type: "text" })
    sourceRef!: string

    /** The need as the person said it. */
    @Column({ name: "need", type: "text" })
    need!: string

    /** The contact's name as said. */
    @Column({ name: "contact_name", type: "text", nullable: true })
    contactName!: string | null

    /** The contact's phone as said. */
    @Column({ name: "phone", type: "text", nullable: true })
    phone!: string | null

    /** The contact's mail as said. */
    @Column({ name: "email", type: "text", nullable: true })
    email!: string | null

    /** The domain the need is about, as said. */
    @Column({ name: "domain", type: "text", nullable: true })
    domain!: string | null

    /** The customer code: as given at the enquiry (an existing customer), or the one the purchase was accepted for. */
    @Column({ name: "customer_code", type: "text", nullable: true })
    customerCode!: string | null

    /** The customer, once the purchase is accepted. */
    @Column({ name: "crm_customer_id", type: "uuid", nullable: true })
    customerId!: string | null

    /** The lines of the current quote. */
    @Column({ name: "lines", type: "jsonb", nullable: true })
    lines!: ReadonlyArray<PurchaseLineValue> | null

    /** The quote before VAT, whole VND. */
    @Column({ name: "net_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    netVnd!: number | null

    /** The VAT rate of the quote, percent. */
    @Column({ name: "vat_rate_percent", type: "integer", nullable: true })
    vatRatePercent!: number | null

    /** The quote's VAT, whole VND. */
    @Column({ name: "vat_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    vatVnd!: number | null

    /** The quote's total, whole VND. */
    @Column({ name: "total_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    totalVnd!: number | null

    /** Where the quote's prices came from. */
    @Column({ name: "price_source", type: "text", nullable: true })
    priceSource!: PriceSource | null

    /** The day of the current quote. */
    @Column({ name: "quoted_on", type: "date", nullable: true })
    quotedOn!: string | null

    /** The last day the quote holds. */
    @Column({ name: "valid_until", type: "date", nullable: true })
    validUntil!: string | null

    /** The transfer code of the first instalment, set at acceptance. */
    @Column({ name: "payment_code", type: "text", nullable: true })
    paymentCode!: string | null

    /** The bank row that proved the payment. */
    @Column({ name: "transaction_ref", type: "text", nullable: true })
    transactionRef!: string | null

    /** When the payment was recorded. */
    @Column({ name: "paid_at", type: "timestamptz", nullable: true })
    paidAt!: Date | null

    /** When the acceptance was recorded. */
    @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
    acceptedAt!: Date | null

    /** The project the acceptance opened (a website build), if any. */
    @Column({ name: "project_code", type: "text", nullable: true })
    projectCode!: string | null

    /** The contract record the acceptance opened. */
    @Column({ name: "contract_no", type: "text", nullable: true })
    contractNo!: string | null

    /** A note: why it was lost, or the person's note on the outcome. */
    @Column({ name: "note", type: "text", nullable: true })
    note!: string | null

    /** Who confirmed the outcome. */
    @Column({ name: "confirmed_by", type: "text", nullable: true })
    confirmedBy!: string | null

    /** When the outcome was confirmed. */
    @Column({ name: "confirmed_at", type: "timestamptz", nullable: true })
    confirmedAt!: Date | null

    /** The sha256 of the item it was imported from (null for a record the CRM made itself): an unchanged item is not written again. */
    @Column({ name: "source_hash", type: "text", nullable: true })
    sourceHash!: string | null
}

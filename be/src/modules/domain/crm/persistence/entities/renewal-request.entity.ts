import { Column, Entity } from "typeorm"
import type { PriceSource, RenewalPlugin, RenewalState } from "../../renewal.contracts"
import { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"

@Entity({ name: "crm_renewal_requests" })
/** One renewal asked of a provider plugin, keyed by the caller's replay key. Mapped from db/migrations 0001 to 0004; id, created_at and updated_at come from UuidAbstractEntity. */
export class RenewalRequestEntity extends UuidAbstractEntity {
    /** The enterprise workspace the row belongs to (every CRM row is keyed by it). */
    @Column({ name: "workspace_id", type: "uuid" })
    workspaceId!: string

    /** The service. */
    @Column({ name: "service_id", type: "uuid" })
    serviceId!: string

    /** The plugin that took it. */
    @Column({ name: "provider", type: "text" })
    provider!: string

    /** The renewal term, months. */
    @Column({ name: "term_months", type: "integer" })
    termMonths!: number

    /** awaiting_payment, paid, pending_person, renewed, failed or cancelled (0005). */
    @Column({ name: "state", type: "text" })
    state!: RenewalState

    /** True while nothing external was or will be asked of a provider (the quote, a dry execution, the mock plugin). */
    @Column({ name: "dry_run", type: "boolean" })
    dryRun!: boolean

    /** The caller's replay key. */
    @Column({ name: "request_key", type: "text" })
    requestKey!: string

    /** Who confirmed the renewal was done. */
    @Column({ name: "confirmed_by", type: "text", nullable: true })
    confirmedBy!: string | null

    /** When it was confirmed. */
    @Column({ name: "confirmed_at", type: "timestamptz", nullable: true })
    confirmedAt!: Date | null

    /** sha256 of the quote request (0005). */
    @Column({ name: "request_hash", type: "text", nullable: true })
    requestHash!: string | null

    /** Amount before VAT, whole VND (0005). */
    @Column({ name: "net_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    netVnd!: number | null

    /** VAT, whole VND. */
    @Column({ name: "vat_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    vatVnd!: number | null

    /** What the customer pays, whole VND. */
    @Column({ name: "total_vnd", type: "bigint", nullable: true, transformer: bigintNumberTransformer })
    totalVnd!: number | null

    /** placeholder or price_sheet. */
    @Column({ name: "price_source", type: "text" })
    priceSource!: PriceSource

    /** The code the customer writes in the transfer. */
    @Column({ name: "payment_code", type: "text", nullable: true })
    paymentCode!: string | null

    /** The bank row's id that proved the payment. */
    @Column({ name: "transaction_ref", type: "text", nullable: true })
    transactionRef!: string | null

    /** When the payment was recorded. */
    @Column({ name: "paid_at", type: "timestamptz", nullable: true })
    paidAt!: Date | null

    /** The provider plugin that took the execution: manual or mock. */
    @Column({ name: "plugin", type: "text", nullable: true })
    plugin!: RenewalPlugin | null

    /** The replay key of the provider execution. */
    @Column({ name: "execute_key", type: "text", nullable: true })
    executeKey!: string | null

    /** sha256 of the execution request. */
    @Column({ name: "execute_hash", type: "text", nullable: true })
    executeHash!: string | null

    /** When the provider step was asked. */
    @Column({ name: "executed_at", type: "timestamptz", nullable: true })
    executedAt!: Date | null

    /** The provider's (or the mock's) reference. */
    @Column({ name: "provider_ref", type: "text", nullable: true })
    providerRef!: string | null

    /** The end date after the renewal, when known. */
    @Column({ name: "new_expires_on", type: "date", nullable: true })
    newExpiresOn!: string | null

    /** The confirming person's note. */
    @Column({ name: "outcome_note", type: "text", nullable: true })
    outcomeNote!: string | null
}

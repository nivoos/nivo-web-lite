import { ApiProperty } from "@nestjs/swagger"
import type {
    BalanceView,
    ContactLinkResult,
    ContractView,
    CustomerSummaryView,
    CustomerView,
    DocumentView,
    InvoiceView,
    ReceivableView,
    ServiceView,
} from "@modules/domain/crm"

/** A customer as a list shows it. */
export class CustomerSummaryResponse implements CustomerSummaryView {
    /** The customer code as the books write it. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly code!: string

    /** The customer kind. */
    @ApiProperty({ type: String, enum: ["company", "person", "unknown", "placeholder"] })
    readonly kind!: CustomerSummaryView["kind"]

    /** The name. */
    @ApiProperty({ type: String, maxLength: 400 })
    readonly name!: string

    /** The tax id. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly taxId!: string | null

    /** The phone. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly phone!: string | null

    /** The e-mail. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly email!: string | null

    /** True when a phone, an e-mail or a linked contact is known. */
    @ApiProperty({ type: Boolean })
    readonly reachable!: boolean
}

/** A linked contact. */
export class ContactResponse {
    /** The contact's name. */
    @ApiProperty({ type: String, maxLength: 200 })
    readonly name!: string

    /** The preferred channel. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"], nullable: true })
    readonly preferredChannel!: "zalo" | "email" | "phone" | null

    /** The phone. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly phone!: string | null

    /** The e-mail. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly email!: string | null

    /** The Zalo id. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly zaloId!: string | null
}

/** One customer with its domains and contacts. */
export class CustomerResponse implements CustomerView {
    /** The customer code as the books write it. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly code!: string

    /** The customer kind. */
    @ApiProperty({ type: String, enum: ["company", "person", "unknown", "placeholder"] })
    readonly kind!: CustomerView["kind"]

    /** The name. */
    @ApiProperty({ type: String, maxLength: 400 })
    readonly name!: string

    /** The tax id. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly taxId!: string | null

    /** The phone. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly phone!: string | null

    /** The e-mail. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly email!: string | null

    /** True when a phone, an e-mail or a linked contact is known. */
    @ApiProperty({ type: Boolean })
    readonly reachable!: boolean

    /** The address. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly address!: string | null

    /** The documents folder in the enterprise's drive. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly folderPath!: string | null

    /** The domains of its websites, sorted. */
    @ApiProperty({ type: String, isArray: true, maxItems: 50 })
    readonly domains!: ReadonlyArray<string>

    /** Its linked contacts. */
    @ApiProperty({ type: ContactResponse, isArray: true, maxItems: 20 })
    readonly contacts!: ReadonlyArray<ContactResponse>
}

/** One page of customers. */
export class CustomerPageResponse {
    /** The customers of this page. */
    @ApiProperty({ type: CustomerSummaryResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<CustomerSummaryResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A recurring service of the customer. */
export class CustomerServiceResponse implements ServiceView {
    /** The service code `<SITE>-HOST|TM|SSL`. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly code!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** The website's domain. */
    @ApiProperty({ type: String, maxLength: 253, nullable: true })
    readonly domain!: string | null

    /** The service class. */
    @ApiProperty({ type: String, enum: ["hosting", "domain", "ssl"] })
    readonly serviceClass!: ServiceView["serviceClass"]

    /** tino, inet, azwebsite, manual or null. */
    @ApiProperty({ type: String, maxLength: 40, nullable: true })
    readonly provider!: string | null

    /** The mapped status. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly status!: string

    /** The status as written. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly statusText!: string | null

    /** Started on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly startsOn!: string | null

    /** Ends on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly expiresOn!: string | null

    /** Where the end date came from. */
    @ApiProperty({ type: String, enum: ["provider", "estimated", "invoice", "confirmed", "none"] })
    readonly expirySource!: ServiceView["expirySource"]
}

/** One page of the customer's services. */
export class CustomerServicePageResponse {
    /** The the customer's services of this page. */
    @ApiProperty({ type: CustomerServiceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<CustomerServiceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A contract of the register. */
export class ContractResponse implements ContractView {
    /** The contract number. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly contractNo!: string

    /** The contract kind. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly kind!: string

    /** The partner as written. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly partnerName!: string | null

    /** The value. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly valueVnd!: number | null

    /** Signed on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly signedOn!: string | null

    /** Effective from. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly effectiveOn!: string | null

    /** Ends on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly expiresOn!: string | null

    /** True when it renews itself. */
    @ApiProperty({ type: Boolean, nullable: true })
    readonly autoRenew!: boolean | null

    /** Warranty end. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly warrantyUntil!: string | null

    /** Status as written. */
    @ApiProperty({ type: String, maxLength: 400, nullable: true })
    readonly statusText!: string | null
}

/** One page of the customer's contracts. */
export class ContractPageResponse {
    /** The the customer's contracts of this page. */
    @ApiProperty({ type: ContractResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<ContractResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A VAT invoice issued to the customer. */
export class InvoiceResponse implements InvoiceView {
    /** The 8-digit invoice number. */
    @ApiProperty({ type: String, maxLength: 8 })
    readonly invoiceNo!: string

    /** Issued on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly issuedOn!: string | null

    /** The amount. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly amountVnd!: number | null

    /** True when the PDF is in the documents folder. */
    @ApiProperty({ type: Boolean })
    readonly hasDocument!: boolean
}

/** One page of the customer's invoices. */
export class InvoicePageResponse {
    /** The the customer's invoices of this page. */
    @ApiProperty({ type: InvoiceResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<InvoiceResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** A document reference (never content). */
export class DocumentResponse implements DocumentView {
    /** The path in the enterprise's drive. */
    @ApiProperty({ type: String, maxLength: 1000 })
    readonly path!: string

    /** The kind. */
    @ApiProperty({ type: String, maxLength: 40 })
    readonly kind!: string

    /** The invoice it is. */
    @ApiProperty({ type: String, maxLength: 8, nullable: true })
    readonly invoiceNo!: string | null

    /** The contract it is. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly contractNo!: string | null

    /** The file name. */
    @ApiProperty({ type: String, maxLength: 400 })
    readonly fileName!: string

    /** Size in bytes. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 2147483647 })
    readonly sizeBytes!: number
}

/** One page of the customer's documents. */
export class DocumentPageResponse {
    /** The the customer's documents of this page. */
    @ApiProperty({ type: DocumentResponse, isArray: true, maxItems: 50 })
    readonly items!: ReadonlyArray<DocumentResponse>

    /** The cursor of the next page; null on the last page. */
    @ApiProperty({ type: String, maxLength: 2048, nullable: true })
    readonly nextCursor!: string | null
}

/** The TK131 balance (NOT a debt to collect). */
export class LedgerResponse {
    /** Opening debit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly openingDebitVnd!: number | null

    /** Opening credit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly openingCreditVnd!: number | null

    /** Period debit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly debitVnd!: number | null

    /** Period credit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly creditVnd!: number | null

    /** Closing debit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly closingDebitVnd!: number | null

    /** Closing credit. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly closingCreditVnd!: number | null
}

/** An open real receivable of the customer. */
export class OpenReceivableResponse implements ReceivableView {
    /** The project code. */
    @ApiProperty({ type: String, maxLength: 120 })
    readonly projectCode!: string

    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80, nullable: true })
    readonly customerCode!: string | null

    /** The contract reference as written. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly contractRef!: string | null

    /** Total. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly totalVnd!: number | null

    /** Collected. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly collectedVnd!: number | null

    /** Remaining. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64", nullable: true })
    readonly remainingVnd!: number | null

    /** Due on. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly dueOn!: string | null

    /** The project's state as written. */
    @ApiProperty({ type: String, maxLength: 200, nullable: true })
    readonly projectState!: string | null

    /** The Ho Chi Minh day of the last notice. */
    @ApiProperty({ type: String, format: "date", nullable: true })
    readonly lastNoticeOn!: string | null

    /** Notices recorded. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly noticeCount!: number

    /** Payments recorded by bank reference. */
    @ApiProperty({ type: "integer", minimum: 0, maximum: 100000 })
    readonly paymentCount!: number
}

/** A customer's TK131 balance and open receivables, side by side, never summed together. */
export class BalanceResponse implements BalanceView {
    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** The TK131 balance; null when the books have none. */
    @ApiProperty({ type: LedgerResponse, nullable: true })
    readonly ledger131!: LedgerResponse | null

    /** Receivables with remaining > 0. */
    @ApiProperty({ type: OpenReceivableResponse, isArray: true, maxItems: 50 })
    readonly openReceivables!: ReadonlyArray<OpenReceivableResponse>

    /** Sum of their remaining. Whole VND. */
    @ApiProperty({ type: "integer", format: "int64" })
    readonly openRemainingVnd!: number
}

/** What the link did. */
export class ContactLinkResponse implements ContactLinkResult {
    /** The customer. */
    @ApiProperty({ type: String, maxLength: 80 })
    readonly customerCode!: string

    /** True when a new contact was created; false when the address was linked already. */
    @ApiProperty({ type: Boolean })
    readonly created!: boolean

    /** The contact. */
    @ApiProperty({ type: ContactResponse })
    readonly contact!: ContactResponse
}

/** A short-lived download link of a stored original. */
export class DocumentLinkResponse {
    /** The presigned GET address of the private object; it works until `expiresAt`, then never again. */
    @ApiProperty({ type: String, maxLength: 4000 })
    readonly url!: string

    /** When the address stops working (ISO 8601 UTC). */
    @ApiProperty({ type: String, format: "date-time" })
    readonly expiresAt!: string
}

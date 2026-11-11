import type { PageInput } from "@modules/platform/pagination"

/** customer kinds. */
export type CustomerKind = "company" | "person" | "unknown" | "placeholder"

/** Contact channels. */
export type ContactChannel = "zalo" | "email" | "phone"

/** A customer as a list shows it. */
export interface CustomerSummaryView {
    /** The code as the books write it. */
    readonly code: string
    /** company, person, unknown or placeholder. */
    readonly kind: CustomerKind
    /** The name. */
    readonly name: string
    /** The tax id. */
    readonly taxId: string | null
    /** The phone. */
    readonly phone: string | null
    /** The e-mail. */
    readonly email: string | null
    /** True when a phone, an e-mail or a linked contact is known. */
    readonly reachable: boolean
}

/** A contact linked to a customer. */
export interface ContactView {
    /** The contact's name. */
    readonly name: string
    /** The preferred channel. */
    readonly preferredChannel: ContactChannel | null
    /** The phone. */
    readonly phone: string | null
    /** The e-mail. */
    readonly email: string | null
    /** The Zalo conversation or user id. */
    readonly zaloId: string | null
}

/** One customer with its domains and contacts. */
export interface CustomerView extends CustomerSummaryView {
    /** The address. */
    readonly address: string | null
    /** The documents folder (a path in the enterprise's drive). */
    readonly folderPath: string | null
    /** The domains of its websites, sorted. */
    readonly domains: ReadonlyArray<string>
    /** Its linked contacts (at most 20). */
    readonly contacts: ReadonlyArray<ContactView>
}

/** A contract of the register. */
export interface ContractView {
    /** The contract number. */
    readonly contractNo: string
    /** The contract kind. */
    readonly kind: string
    /** The partner as written. */
    readonly partnerName: string | null
    /** Value, whole VND. */
    readonly valueVnd: number | null
    /** Signed on. */
    readonly signedOn: string | null
    /** Effective from. */
    readonly effectiveOn: string | null
    /** Ends on. */
    readonly expiresOn: string | null
    /** True when it renews itself. */
    readonly autoRenew: boolean | null
    /** Warranty end. */
    readonly warrantyUntil: string | null
    /** Status text as written. */
    readonly statusText: string | null
}

/** A VAT invoice issued to the customer. */
export interface InvoiceView {
    /** The 8-digit number. */
    readonly invoiceNo: string
    /** Issued on. */
    readonly issuedOn: string | null
    /** Amount, whole VND. */
    readonly amountVnd: number | null
    /** True when the PDF is in the documents folder. */
    readonly hasDocument: boolean
}

/** A document reference (never content). */
export interface DocumentView {
    /** The path in the enterprise's drive. */
    readonly path: string
    /** The kind. */
    readonly kind: string
    /** The invoice it is, when it is one. */
    readonly invoiceNo: string | null
    /** The contract it is, when it is one. */
    readonly contractNo: string | null
    /** The file name. */
    readonly fileName: string
    /** Size in bytes. */
    readonly sizeBytes: number
}

/** The TK131 balance of a customer (NOT a debt to collect). */
export interface LedgerView {
    /** Opening debit. */
    readonly openingDebitVnd: number
    /** Opening credit. */
    readonly openingCreditVnd: number
    /** Period debit. */
    readonly debitVnd: number
    /** Period credit. */
    readonly creditVnd: number
    /** Closing debit. */
    readonly closingDebitVnd: number
    /** Closing credit. */
    readonly closingCreditVnd: number
}

/** A real collection: a project's receivable. */
export interface ReceivableView {
    /** The project code. */
    readonly projectCode: string
    /** The customer, when matched. */
    readonly customerCode: string | null
    /** The contract reference as written. */
    readonly contractRef: string | null
    /** Total, whole VND. */
    readonly totalVnd: number
    /** Collected, whole VND. */
    readonly collectedVnd: number
    /** Remaining, whole VND. */
    readonly remainingVnd: number
    /** Due on, when the books say. */
    readonly dueOn: string | null
    /** The project's state as written. */
    readonly projectState: string | null
    /** The Ho Chi Minh day of the last notice. */
    readonly lastNoticeOn: string | null
    /** How many notices were recorded. */
    readonly noticeCount: number
    /** How many payments were recorded against it (by bank reference). */
    readonly paymentCount: number
}

/** A customer's balance facts: the TK131 balance and the open receivables, side by side, never summed. */
export interface BalanceView {
    /** The customer. */
    readonly customerCode: string
    /** The TK131 balance; null when the books have none. */
    readonly ledger131: LedgerView | null
    /** Receivables with remaining > 0 (at most 50). */
    readonly openReceivables: ReadonlyArray<ReceivableView>
    /** Sum of their remaining, whole VND. */
    readonly openRemainingVnd: number
}

/** Names one customer. */
export interface CustomerKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The customer code. */
    readonly code: string
}

/** Searches customers. */
export interface CustomerFindInput {
    /** The workspace. */
    readonly workspaceId: string
    /** Text matched against code, name, tax id, phone, e-mail and domain (case-insensitive substring). */
    readonly q: string
    /** The page. */
    readonly page: PageInput
}

/** Lists what belongs to one customer. */
export interface CustomerListInput extends CustomerKey {
    /** The page. */
    readonly page: PageInput
}

/** Links a contact address to a customer. */
export interface ContactLinkInput extends CustomerKey {
    /** The channel of the address. */
    readonly channel: ContactChannel
    /** The Zalo id, e-mail or phone. */
    readonly address: string
    /** The person's name; the customer's name when absent. */
    readonly name: string | null
}

/** What the link did. */
export interface ContactLinkResult {
    /** The customer. */
    readonly customerCode: string
    /** True when a new contact row was created, false when the address was linked already. */
    readonly created: boolean
    /** The contact. */
    readonly contact: ContactView
}

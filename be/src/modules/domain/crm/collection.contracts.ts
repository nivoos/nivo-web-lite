import type { PageInput } from "@modules/platform/pagination"
import type { ReminderChannel } from "./service.contracts"

/** The overdue receivables list. */
export interface OverdueInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The reference day; today in Ho Chi Minh when absent. */
    readonly asOf: string | null
    /** The page. */
    readonly page: PageInput
}

/** Names one receivable. */
export interface ReceivableKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The project code. */
    readonly projectCode: string
}

/** Records a notice about a receivable. */
export interface NoticeRecordInput extends ReceivableKey {
    /** The replay key. */
    readonly requestKey: string
    /** The channel. */
    readonly channel: ReminderChannel
    /** The channel's message id. */
    readonly messageRef: string | null
}

/** A notice recorded. */
export interface NoticeView {
    /** The row id. */
    readonly id: string
    /** The project code. */
    readonly projectCode: string
    /** The channel. */
    readonly channel: ReminderChannel
    /** The channel's message id. */
    readonly messageRef: string | null
    /** When it was sent. */
    readonly sentAt: string
}

/** Records a payment by the bank row's reference. */
export interface ReceivablePaymentInput extends ReceivableKey {
    /** The bank transaction's id. */
    readonly transactionRef: string
}

/** A payment recorded. */
export interface ReceivablePaymentView {
    /** The row id. */
    readonly id: string
    /** The project code. */
    readonly projectCode: string
    /** The bank transaction's id. */
    readonly transactionRef: string
    /** When it was recorded. */
    readonly recordedAt: string
}

/** A TK331 party (supplier) with its balance and notes. */
export interface PayableView {
    /** The party code of the books. */
    readonly partyCode: string
    /** The party name as written. */
    readonly partyName: string | null
    /** Closing credit (what NIVO Web owes), whole VND. */
    readonly closingCreditVnd: number
    /** Closing debit, whole VND. */
    readonly closingDebitVnd: number
    /** How many supplier invoices were noted. */
    readonly noteCount: number
    /** The invoice number of the last note. */
    readonly lastNoteInvoiceNo: string | null
}

/** Lists payables. */
export interface PayableListInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The page. */
    readonly page: PageInput
}

/** Notes a supplier invoice against a TK331 party. */
export interface PayableNoteInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The party code. */
    readonly partyCode: string
    /** The replay key. */
    readonly requestKey: string
    /** The supplier's invoice number. */
    readonly invoiceNo: string | null
    /** The invoice date. */
    readonly issuedOn: string | null
    /** The e-invoice reference. */
    readonly einvoiceRef: string | null
    /** A short note. */
    readonly note: string | null
}

/** A supplier invoice note. */
export interface PayableNoteView {
    /** The row id. */
    readonly id: string
    /** The party code. */
    readonly partyCode: string
    /** The supplier's invoice number. */
    readonly invoiceNo: string | null
    /** The invoice date. */
    readonly issuedOn: string | null
    /** The e-invoice reference. */
    readonly einvoiceRef: string | null
    /** A short note. */
    readonly note: string | null
    /** When it was recorded. */
    readonly recordedAt: string
}

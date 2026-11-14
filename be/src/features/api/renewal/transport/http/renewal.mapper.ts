import { toPageInput } from "@modules/platform/pagination"
import type {
    QuoteInput,
    RenewalKey,
    RenewalOpenListInput,
    RenewalOutcomeInput,
    RenewalPaymentInput,
} from "@modules/domain/crm"
import type {
    CreateQuoteRequest,
    ListOpenRenewalsRequest,
    RecordRenewalOutcomeRequest,
    RecordRenewalPaymentRequest,
    RenewalPathRequest,
} from "./dto/renewal.request"

/** The request of `renewal.quote.create`. */
export const toQuoteRequest = (workspaceId: string, requestKey: string, body: CreateQuoteRequest): QuoteInput => ({
    workspaceId,
    requestKey,
    serviceCode: body.serviceCode,
    termMonths: body.termMonths,
})

/** The request of `renewal.open.list`. */
export const toListOpenRequest = (workspaceId: string, query: ListOpenRenewalsRequest): RenewalOpenListInput => ({
    workspaceId,
    customerCode: query.customerCode,
    state: query.state,
    page: toPageInput(query),
})

/** The request of `renewal.get`. */
export const toGetRequest = (workspaceId: string, path: RenewalPathRequest): RenewalKey => ({
    workspaceId,
    id: path.id,
})

/** The request of `renewal.payment.record`. */
export const toRecordPaymentRequest = (
    workspaceId: string,
    path: RenewalPathRequest,
    body: RecordRenewalPaymentRequest,
): RenewalPaymentInput => ({ workspaceId, id: path.id, transactionRef: body.transactionRef })

/** The request of `renewal.outcome.record`. */
export const toRecordOutcomeRequest = (
    workspaceId: string,
    path: RenewalPathRequest,
    body: RecordRenewalOutcomeRequest,
): RenewalOutcomeInput => ({
    workspaceId,
    id: path.id,
    outcome: body.outcome,
    providerRef: body.providerRef,
    newExpiresOn: body.newExpiresOn,
    confirmedBy: body.confirmedBy,
    note: body.note,
})

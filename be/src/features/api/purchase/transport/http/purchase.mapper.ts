import { toPageInput } from "@modules/platform/pagination"
import type { CreateCustomerInput } from "../../application/create-customer.command"
import type { CreatePurchaseInput } from "../../application/create-purchase.command"
import type { CreatePurchaseQuoteInput } from "../../application/create-purchase-quote.command"
import type { GetPurchaseInput } from "../../application/get-purchase.query"
import type { ListOpenPurchasesInput } from "../../application/list-open-purchases.query"
import type { RecordAcceptanceInput } from "../../application/record-acceptance.command"
import type { RecordFollowUpInput } from "../../application/record-follow-up.command"
import type { RecordPurchaseOutcomeInput } from "../../application/record-purchase-outcome.command"
import type { RecordPurchasePaymentInput } from "../../application/record-purchase-payment.command"
import type { UpdatePurchaseInput } from "../../application/update-purchase.command"
import type {
    CreateCustomerRequest,
    CreatePurchaseQuoteRequest,
    CreatePurchaseRequest,
    ListOpenPurchasesRequest,
    PurchasePathRequest,
    RecordAcceptanceRequest,
    RecordFollowUpRequest,
    RecordPurchaseOutcomeRequest,
    RecordPurchasePaymentRequest,
    UpdatePurchaseRequest,
} from "./dto/purchase.request"

/** The request of `purchase.create`. */
export const toCreateRequest = (workspaceId: string, body: CreatePurchaseRequest): CreatePurchaseInput => ({
    workspaceId,
    channel: body.channel,
    sourceRef: body.sourceRef,
    need: body.need,
    contactName: body.contactName,
    phone: body.phone,
    email: body.email,
    domain: body.domain,
    customerCode: body.customerCode,
})

/** The request of `purchase.update`. */
export const toUpdateRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: UpdatePurchaseRequest,
): UpdatePurchaseInput => ({
    workspaceId,
    id: path.id,
    need: body.need,
    contactName: body.contactName,
    phone: body.phone,
    email: body.email,
    domain: body.domain,
    state: body.state,
    note: body.note,
})

/** The request of `purchase.get`. */
export const toGetRequest = (workspaceId: string, path: PurchasePathRequest): GetPurchaseInput => ({
    workspaceId,
    id: path.id,
})

/** The request of `purchase.open.list`. */
export const toListOpenRequest = (workspaceId: string, query: ListOpenPurchasesRequest): ListOpenPurchasesInput => ({
    workspaceId,
    state: query.state,
    sourceRef: query.sourceRef,
    page: toPageInput(query),
})

/** The request of `purchase.quote.create`. */
export const toQuoteRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: CreatePurchaseQuoteRequest,
): CreatePurchaseQuoteInput => ({
    workspaceId,
    id: path.id,
    items: body.items.map((item) => ({
        priceCode: item.priceCode,
        termMonths: item.termMonths,
        quantity: item.quantity,
    })),
})

/** The request of `purchase.followup.record`. */
export const toFollowUpRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: RecordFollowUpRequest,
): RecordFollowUpInput => ({
    workspaceId,
    id: path.id,
    channel: body.channel,
    outcome: body.outcome,
    messageRef: body.messageRef,
})

/** The request of `customer.create`. */
export const toCreateCustomerRequest = (workspaceId: string, body: CreateCustomerRequest): CreateCustomerInput => ({
    workspaceId,
    purchaseId: body.purchaseId,
    kind: body.kind,
    name: body.name,
    taxId: body.taxId,
    address: body.address,
    phone: body.phone,
    email: body.email,
})

/** The request of `purchase.accept.record`. */
export const toAcceptRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: RecordAcceptanceRequest,
): RecordAcceptanceInput => ({ workspaceId, id: path.id, customerCode: body.customerCode, dryRun: body.dryRun })

/** The request of `purchase.payment.record`. */
export const toPaymentRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: RecordPurchasePaymentRequest,
): RecordPurchasePaymentInput => ({ workspaceId, id: path.id, transactionRef: body.transactionRef })

/** The request of `purchase.outcome.record`. */
export const toOutcomeRequest = (
    workspaceId: string,
    path: PurchasePathRequest,
    body: RecordPurchaseOutcomeRequest,
): RecordPurchaseOutcomeInput => ({
    workspaceId,
    id: path.id,
    outcome: body.outcome,
    confirmedBy: body.confirmedBy,
    note: body.note,
})

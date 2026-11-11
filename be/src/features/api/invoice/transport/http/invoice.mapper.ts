import type { InvoiceDraftCreateInput, InvoiceDraftKey } from "@modules/domain/crm"
import { toPageInput } from "@modules/platform/pagination"
import type { InvoiceListInput } from "../../application/list-invoices.query"
import type { CreateInvoiceDraftRequest, InvoiceDraftPathRequest, ListInvoicesRequest } from "./dto/invoice.request"

/** The request of `invoice.draft.create`. */
export const toCreateRequest = (workspaceId: string, body: CreateInvoiceDraftRequest): InvoiceDraftCreateInput => ({
    workspaceId,
    renewalId: body.renewalId,
    purchaseId: body.purchaseId,
})

/** The request of `invoice.draft.get`. */
export const toGetRequest = (workspaceId: string, path: InvoiceDraftPathRequest): InvoiceDraftKey => ({
    workspaceId,
    id: path.id,
})

/** The request of `invoice.list`. */
export const toListRequest = (workspaceId: string, query: ListInvoicesRequest): InvoiceListInput => ({
    workspaceId,
    customerCode: query.customerCode,
    issuedFrom: query.issuedFrom,
    issuedTo: query.issuedTo,
    page: toPageInput(query),
})

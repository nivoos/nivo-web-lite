import type { InvoiceDraftCreateInput, InvoiceDraftKey } from "@modules/domain/crm"
import type { CreateInvoiceDraftRequest, InvoiceDraftPathRequest } from "./dto/invoice.request"

/** The request of `invoice.draft.create`. */
export const toCreateRequest = (workspaceId: string, body: CreateInvoiceDraftRequest): InvoiceDraftCreateInput => ({
    workspaceId,
    renewalId: body.renewalId,
})

/** The request of `invoice.draft.get`. */
export const toGetRequest = (workspaceId: string, path: InvoiceDraftPathRequest): InvoiceDraftKey => ({
    workspaceId,
    id: path.id,
})

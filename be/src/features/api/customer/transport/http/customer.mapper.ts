import { toPageInput } from "@modules/platform/pagination"
import type { ContactLinkInput, CustomerFindInput, CustomerKey, CustomerListInput } from "@modules/domain/crm"
import type { PageRequest } from "@modules/platform/openapi"
import type { DocumentLinkInput } from "../../application/get-customer-document-link.query"
import type {
    CustomerPathRequest,
    DocumentLinkRequest,
    FindCustomerRequest,
    LinkContactRequest,
} from "./dto/customer.request"

/** The request of `customer.find`. */
export const toFindRequest = (workspaceId: string, query: FindCustomerRequest): CustomerFindInput => ({
    workspaceId,
    q: query.q,
    page: toPageInput(query),
})

/** The request of `customer.get`. */
export const toGetRequest = (workspaceId: string, path: CustomerPathRequest): CustomerKey => ({
    workspaceId,
    code: path.code,
})

/** The request of `customer.service.list`. */
export const toListServicesRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    query: PageRequest,
): CustomerListInput => ({ workspaceId, code: path.code, page: toPageInput(query) })

/** The request of `customer.contract.list`. */
export const toListContractsRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    query: PageRequest,
): CustomerListInput => ({ workspaceId, code: path.code, page: toPageInput(query) })

/** The request of `customer.invoice.list`. */
export const toListInvoicesRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    query: PageRequest,
): CustomerListInput => ({ workspaceId, code: path.code, page: toPageInput(query) })

/** The request of `customer.document.list`. */
export const toListDocumentsRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    query: PageRequest,
): CustomerListInput => ({ workspaceId, code: path.code, page: toPageInput(query) })

/** The request of `customer.balance.get`. */
export const toBalanceRequest = (workspaceId: string, path: CustomerPathRequest): CustomerKey => ({
    workspaceId,
    code: path.code,
})

/** The request of `customer.contact.update`. */
export const toLinkContactRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    body: LinkContactRequest,
): ContactLinkInput => ({ workspaceId, code: path.code, channel: body.channel, address: body.address, name: body.name })

/** The request of `customer.document.link.get`. */
export const toDocumentLinkRequest = (
    workspaceId: string,
    path: CustomerPathRequest,
    query: DocumentLinkRequest,
): DocumentLinkInput => ({ workspaceId, code: path.code, path: query.path })

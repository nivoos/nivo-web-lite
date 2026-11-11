import { toPageInput } from "@modules/platform/pagination"
import type { TicketCreateInput, TicketKey, TicketListInput, TicketUpdateInput } from "@modules/domain/crm"
import type {
    CreateTicketRequest,
    ListTicketsRequest,
    TicketPathRequest,
    UpdateTicketRequest,
} from "./dto/ticket.request"

/** The request of `ticket.create`. */
export const toCreateRequest = (
    workspaceId: string,
    requestKey: string,
    body: CreateTicketRequest,
): TicketCreateInput => ({
    workspaceId,
    requestKey,
    customerCode: body.customerCode,
    serviceCodes: body.serviceCodes,
    kind: body.kind,
    channel: body.channel,
    sourceRef: body.sourceRef,
    subject: body.subject,
    summary: body.summary,
})

/** The request of `ticket.list`. */
export const toListRequest = (workspaceId: string, query: ListTicketsRequest): TicketListInput => ({
    workspaceId,
    customerCode: query.customerCode,
    status: query.status,
    page: toPageInput(query),
})

/** The request of `ticket.get`. */
export const toGetRequest = (workspaceId: string, path: TicketPathRequest): TicketKey => ({ workspaceId, id: path.id })

/** The request of `ticket.update`. */
export const toUpdateRequest = (
    workspaceId: string,
    requestKey: string,
    path: TicketPathRequest,
    body: UpdateTicketRequest,
): TicketUpdateInput => ({
    workspaceId,
    id: path.id,
    requestKey,
    status: body.status,
    note: body.note,
    author: body.author,
})

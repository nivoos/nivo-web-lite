import { toPageInput } from "@modules/platform/pagination"
import type { PayableListInput, PayableNoteInput } from "@modules/domain/crm"
import type { PageRequest } from "@modules/platform/openapi"
import type { PartyPathRequest, RecordPayableNoteRequest } from "./dto/payable.request"

/** The request of `payable.list`. */
export const toListRequest = (workspaceId: string, query: PageRequest): PayableListInput => ({
    workspaceId,
    page: toPageInput(query),
})

/** The request of `payable.note.record`. */
export const toRecordNoteRequest = (
    workspaceId: string,
    requestKey: string,
    path: PartyPathRequest,
    body: RecordPayableNoteRequest,
): PayableNoteInput => ({
    workspaceId,
    partyCode: path.partyCode,
    requestKey,
    invoiceNo: body.invoiceNo,
    issuedOn: body.issuedOn,
    einvoiceRef: body.einvoiceRef,
    note: body.note,
})

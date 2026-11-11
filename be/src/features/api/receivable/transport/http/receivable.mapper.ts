import { toPageInput } from "@modules/platform/pagination"
import type { NoticeRecordInput, OverdueInput, ReceivablePaymentInput } from "@modules/domain/crm"
import type {
    ListOverdueRequest,
    ProjectPathRequest,
    RecordNoticeRequest,
    RecordReceivablePaymentRequest,
} from "./dto/receivable.request"

/** The request of `receivable.overdue.list`. */
export const toListOverdueRequest = (workspaceId: string, query: ListOverdueRequest): OverdueInput => ({
    workspaceId,
    asOf: query.asOf,
    page: toPageInput(query),
})

/** The request of `receivable.notice.record`. */
export const toRecordNoticeRequest = (
    workspaceId: string,
    requestKey: string,
    path: ProjectPathRequest,
    body: RecordNoticeRequest,
): NoticeRecordInput => ({
    workspaceId,
    projectCode: path.code,
    requestKey,
    channel: body.channel,
    messageRef: body.messageRef,
})

/** The request of `receivable.payment.record`. */
export const toRecordPaymentRequest = (
    workspaceId: string,
    path: ProjectPathRequest,
    body: RecordReceivablePaymentRequest,
): ReceivablePaymentInput => ({ workspaceId, projectCode: path.code, transactionRef: body.transactionRef })

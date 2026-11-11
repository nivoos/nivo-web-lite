import { toPageInput } from "@modules/platform/pagination"
import type { ExpiringInput, ReminderRecordInput, ServiceKey } from "@modules/domain/crm"
import type { ListExpiringRequest, RecordReminderRequest, ServicePathRequest } from "./dto/service.request"

/** The request of `service.expiring.list`. */
export const toListExpiringRequest = (workspaceId: string, query: ListExpiringRequest): ExpiringInput => ({
    workspaceId,
    asOf: query.asOf,
    withinDays: query.withinDays,
    includeExpired: query.includeExpired,
    page: toPageInput(query),
})

/** The request of `service.status.get`. */
export const toStatusRequest = (workspaceId: string, path: ServicePathRequest): ServiceKey => ({
    workspaceId,
    code: path.code,
})

/** The request of `service.reminder.record`. */
export const toRecordReminderRequest = (
    workspaceId: string,
    requestKey: string,
    path: ServicePathRequest,
    body: RecordReminderRequest,
): ReminderRecordInput => ({
    workspaceId,
    code: path.code,
    requestKey,
    channel: body.channel,
    outcome: body.outcome,
    messageRef: body.messageRef,
})

import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmIdempotencyKey, CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { ListOverdueReceivablesQuery } from "../../application/list-overdue-receivables.query"
import { RecordNoticeCommand } from "../../application/record-notice.command"
import { RecordReceivablePaymentCommand } from "../../application/record-receivable-payment.command"
import {
    ListOverdueRequest,
    ProjectPathRequest,
    RecordNoticeRequest,
    RecordReceivablePaymentRequest,
} from "./dto/receivable.request"
import { NoticeResponse, ReceivablePageResponse, ReceivablePaymentResponse } from "./dto/receivable.response"
import { toListOverdueRequest, toRecordNoticeRequest, toRecordPaymentRequest } from "./receivable.mapper"

@ApiTags("receivable")
@Controller()
@Credential({ kind: "api-key" })
/** The receivable doors: the REAL collections (projects' unpaid amounts), never the TK131 balances. */
export class ReceivableController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `receivable.overdue.list`: List the receivables with an amount remaining past due (or undated), with notice facts. */
    @Get("v1/receivables/overdue")
    @CrmOperation({
        id: "receivable.overdue.list",
        summary: "List the receivables with an amount remaining past due (or undated), with notice facts.",
        response: ReceivablePageResponse,
        effect: "read",
    })
    listOverdue(
        @CrmWorkspace() workspaceId: string,
        @Query() query: ListOverdueRequest,
    ): Promise<ReceivablePageResponse> {
        return this.queryBus.execute(
            new ListOverdueReceivablesQuery({ request: toListOverdueRequest(workspaceId, query) }),
        )
    }

    /** `receivable.notice.record`: Record a payment notice sent about a receivable (writes crm_receivable_notices; sends nothing). */
    @Post("v1/receivables/:code/notices")
    @CrmOperation({
        id: "receivable.notice.record",
        summary: "Record a payment notice sent about a receivable (writes crm_receivable_notices; sends nothing).",
        response: NoticeResponse,
        effect: "write",
        idempotencyKey: true,
        status: 201,
    })
    recordNotice(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Param() path: ProjectPathRequest,
        @Body() body: RecordNoticeRequest,
    ): Promise<NoticeResponse> {
        return this.commandBus.execute(
            new RecordNoticeCommand({ request: toRecordNoticeRequest(workspaceId, requestKey, path, body) }),
        )
    }

    /** `receivable.payment.record`: Record that a bank transaction paid a receivable, by the bank row's id, never an amount (idempotent by transaction). */
    @Post("v1/receivables/:code/payments")
    @CrmOperation({
        id: "receivable.payment.record",
        summary:
            "Record that a bank transaction paid a receivable, by the bank row's id, never an amount (idempotent by transaction).",
        response: ReceivablePaymentResponse,
        effect: "write",
    })
    recordPayment(
        @CrmWorkspace() workspaceId: string,
        @Param() path: ProjectPathRequest,
        @Body() body: RecordReceivablePaymentRequest,
    ): Promise<ReceivablePaymentResponse> {
        return this.commandBus.execute(
            new RecordReceivablePaymentCommand({ request: toRecordPaymentRequest(workspaceId, path, body) }),
        )
    }
}

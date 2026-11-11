import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmIdempotencyKey, CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation, PageRequest } from "@modules/platform/openapi"
import { ListPayablesQuery } from "../../application/list-payables.query"
import { RecordPayableNoteCommand } from "../../application/record-payable-note.command"
import { PartyPathRequest, RecordPayableNoteRequest } from "./dto/payable.request"
import { PayableNoteResponse, PayablePageResponse } from "./dto/payable.response"
import { toListRequest, toRecordNoteRequest } from "./payable.mapper"

@ApiTags("payable")
@Controller()
@Credential({ kind: "api-key" })
/** The payable doors: TK331 parties (suppliers) and the supplier invoices noted against them. */
export class PayableController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `payable.list`: List the TK331 parties (suppliers) with their balance and supplier invoice notes. */
    @Get("v1/payables")
    @CrmOperation({
        id: "payable.list",
        summary: "List the TK331 parties (suppliers) with their balance and supplier invoice notes.",
        response: PayablePageResponse,
        effect: "read",
    })
    list(@CrmWorkspace() workspaceId: string, @Query() query: PageRequest): Promise<PayablePageResponse> {
        return this.queryBus.execute(new ListPayablesQuery({ request: toListRequest(workspaceId, query) }))
    }

    /** `payable.note.record`: Note a supplier invoice against a TK331 party (writes crm_payable_notes; the amount stays in the e-invoice). */
    @Post("v1/payables/:partyCode/notes")
    @CrmOperation({
        id: "payable.note.record",
        summary:
            "Note a supplier invoice against a TK331 party (writes crm_payable_notes; the amount stays in the e-invoice).",
        response: PayableNoteResponse,
        effect: "write",
        nivoEffect: "none",
        idempotencyKey: true,
        status: 201,
    })
    recordNote(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Param() path: PartyPathRequest,
        @Body() body: RecordPayableNoteRequest,
    ): Promise<PayableNoteResponse> {
        return this.commandBus.execute(
            new RecordPayableNoteCommand({ request: toRecordNoteRequest(workspaceId, requestKey, path, body) }),
        )
    }
}

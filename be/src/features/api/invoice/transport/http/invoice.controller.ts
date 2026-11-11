import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { CreateInvoiceDraftCommand } from "../../application/create-invoice-draft.command"
import { GetInvoiceDraftQuery } from "../../application/get-invoice-draft.query"
import { ListInvoicesQuery } from "../../application/list-invoices.query"
import { CreateInvoiceDraftRequest, InvoiceDraftPathRequest, ListInvoicesRequest } from "./dto/invoice.request"
import { InvoiceDraftResponse, WorkspaceInvoicePageResponse } from "./dto/invoice.response"
import { toCreateRequest, toGetRequest, toListRequest } from "./invoice.mapper"

@ApiTags("invoice")
@Controller()
@Credential({ kind: "api-key" })
/** The invoice draft doors (data only; issuing through an e-invoice provider is a later operation). */
export class InvoiceController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `invoice.draft.create`: Draft the VAT invoice of a paid renewal; amounts computed by the CRM (issues nothing; one draft per renewal). */
    @Post("v1/invoice-drafts")
    @CrmOperation({
        id: "invoice.draft.create",
        summary:
            "Draft the VAT invoice of a paid renewal; amounts computed by the CRM (issues nothing; one draft per renewal).",
        response: InvoiceDraftResponse,
        effect: "write",
        nivoEffect: "none",
    })
    create(
        @CrmWorkspace() workspaceId: string,
        @Body() body: CreateInvoiceDraftRequest,
    ): Promise<InvoiceDraftResponse> {
        return this.commandBus.execute(new CreateInvoiceDraftCommand({ request: toCreateRequest(workspaceId, body) }))
    }

    /** `invoice.draft.get`: Get one invoice draft. */
    @Get("v1/invoice-drafts/:id")
    @CrmOperation({
        id: "invoice.draft.get",
        summary: "Get one invoice draft.",
        response: InvoiceDraftResponse,
        effect: "read",
    })
    get(@CrmWorkspace() workspaceId: string, @Param() path: InvoiceDraftPathRequest): Promise<InvoiceDraftResponse> {
        return this.queryBus.execute(new GetInvoiceDraftQuery({ request: toGetRequest(workspaceId, path) }))
    }

    /** `invoice.list`: The workspace's VAT invoices by number, optionally of one customer code and an issue period. */
    @Get("v1/invoices")
    @CrmOperation({
        id: "invoice.list",
        summary: "List the workspace's VAT invoices by number, optionally of one customer code and an issue period.",
        response: WorkspaceInvoicePageResponse,
        effect: "read",
    })
    list(
        @CrmWorkspace() workspaceId: string,
        @Query() query: ListInvoicesRequest,
    ): Promise<WorkspaceInvoicePageResponse> {
        return this.queryBus.execute(new ListInvoicesQuery({ request: toListRequest(workspaceId, query) }))
    }
}

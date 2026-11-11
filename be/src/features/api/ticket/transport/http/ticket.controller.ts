import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmIdempotencyKey, CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { CreateTicketCommand } from "../../application/create-ticket.command"
import { ListTicketsQuery } from "../../application/list-tickets.query"
import { GetTicketQuery } from "../../application/get-ticket.query"
import { UpdateTicketCommand } from "../../application/update-ticket.command"
import { CreateTicketRequest, ListTicketsRequest, TicketPathRequest, UpdateTicketRequest } from "./dto/ticket.request"
import { TicketPageResponse, TicketResponse } from "./dto/ticket.response"
import { toCreateRequest, toGetRequest, toListRequest, toUpdateRequest } from "./ticket.mapper"

@ApiTags("ticket")
@Controller()
@Credential({ kind: "api-key" })
/** The ticket doors: the desk flow opens tickets; people work them through notes and status changes. */
export class TicketController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `ticket.create`: Open a support ticket from a conversation or a mail (writes crm_tickets; sends nothing). */
    @Post("v1/tickets")
    @CrmOperation({
        id: "ticket.create",
        summary: "Open a support ticket from a conversation or a mail (writes crm_tickets; sends nothing).",
        response: TicketResponse,
        effect: "write",
        idempotencyKey: true,
        status: 201,
    })
    create(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Body() body: CreateTicketRequest,
    ): Promise<TicketResponse> {
        return this.commandBus.execute(
            new CreateTicketCommand({ request: toCreateRequest(workspaceId, requestKey, body) }),
        )
    }

    /** `ticket.list`: List tickets newest first, optionally of one customer or one status. */
    @Get("v1/tickets")
    @CrmOperation({
        id: "ticket.list",
        summary: "List tickets newest first, optionally of one customer or one status.",
        response: TicketPageResponse,
        effect: "read",
    })
    list(@CrmWorkspace() workspaceId: string, @Query() query: ListTicketsRequest): Promise<TicketPageResponse> {
        return this.queryBus.execute(new ListTicketsQuery({ request: toListRequest(workspaceId, query) }))
    }

    /** `ticket.get`: Get one ticket with its summary and notes. */
    @Get("v1/tickets/:id")
    @CrmOperation({
        id: "ticket.get",
        summary: "Get one ticket with its summary and notes.",
        response: TicketResponse,
        effect: "read",
    })
    get(@CrmWorkspace() workspaceId: string, @Param() path: TicketPathRequest): Promise<TicketResponse> {
        return this.queryBus.execute(new GetTicketQuery({ request: toGetRequest(workspaceId, path) }))
    }

    /** `ticket.update`: Add a note to a ticket and/or move its status (a closed ticket only reopens). */
    @Patch("v1/tickets/:id")
    @CrmOperation({
        id: "ticket.update",
        summary: "Add a note to a ticket and/or move its status (a closed ticket only reopens).",
        response: TicketResponse,
        effect: "write",
        idempotencyKey: true,
    })
    update(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Param() path: TicketPathRequest,
        @Body() body: UpdateTicketRequest,
    ): Promise<TicketResponse> {
        return this.commandBus.execute(
            new UpdateTicketCommand({ request: toUpdateRequest(workspaceId, requestKey, path, body) }),
        )
    }
}

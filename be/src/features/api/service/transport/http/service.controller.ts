import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmIdempotencyKey, CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { ListExpiringServicesQuery } from "../../application/list-expiring-services.query"
import { GetServiceStatusQuery } from "../../application/get-service-status.query"
import { RecordReminderCommand } from "../../application/record-reminder.command"
import { ListExpiringRequest, RecordReminderRequest, ServicePathRequest } from "./dto/service.request"
import { ExpiringServicePageResponse, ReminderResponse, ServiceStatusResponse } from "./dto/service.response"
import { toListExpiringRequest, toRecordReminderRequest, toStatusRequest } from "./service.mapper"

@ApiTags("service")
@Controller()
@Credential({ kind: "api-key" })
/** The service doors: the renewal list, a service's provider state and reminder records. */
export class ServiceController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `service.expiring.list`: List services ending within a window with reachability and reminder facts (no verdict). */
    @Get("v1/services/expiring")
    @CrmOperation({
        id: "service.expiring.list",
        summary: "List services ending within a window with reachability and reminder facts (no verdict).",
        response: ExpiringServicePageResponse,
        effect: "read",
    })
    listExpiring(
        @CrmWorkspace() workspaceId: string,
        @Query() query: ListExpiringRequest,
    ): Promise<ExpiringServicePageResponse> {
        return this.queryBus.execute(
            new ListExpiringServicesQuery({ request: toListExpiringRequest(workspaceId, query) }),
        )
    }

    /** `service.status.get`: Get a service's state from its provider plugin (manual: a person checks; fixture: the CRM's own row, nothing called). */
    @Get("v1/services/:code/status")
    @CrmOperation({
        id: "service.status.get",
        summary:
            "Get a service's state from its provider plugin (manual: a person checks; fixture: the CRM's own row, nothing called).",
        response: ServiceStatusResponse,
        effect: "read",
        customerAudience: { parameter: null },
    })
    status(@CrmWorkspace() workspaceId: string, @Param() path: ServicePathRequest): Promise<ServiceStatusResponse> {
        return this.queryBus.execute(new GetServiceStatusQuery({ request: toStatusRequest(workspaceId, path) }))
    }

    /** `service.reminder.record`: Record a renewal reminder sent about a service, or the customer's answer (writes crm_service_reminders; sends nothing). */
    @Post("v1/services/:code/reminders")
    @CrmOperation({
        id: "service.reminder.record",
        summary:
            "Record a renewal reminder sent about a service, or the customer's answer (writes crm_service_reminders; sends nothing).",
        response: ReminderResponse,
        effect: "write",
        customerAudience: { parameter: null },
        nivoEffect: "none",
        idempotencyKey: true,
        status: 201,
    })
    recordReminder(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Param() path: ServicePathRequest,
        @Body() body: RecordReminderRequest,
    ): Promise<ReminderResponse> {
        return this.commandBus.execute(
            new RecordReminderCommand({ request: toRecordReminderRequest(workspaceId, requestKey, path, body) }),
        )
    }
}

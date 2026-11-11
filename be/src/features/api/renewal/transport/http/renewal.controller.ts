import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmIdempotencyKey, CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { CreateQuoteCommand } from "../../application/create-quote.command"
import { ListOpenRenewalsQuery } from "../../application/list-open-renewals.query"
import { GetRenewalQuery } from "../../application/get-renewal.query"
import { RecordRenewalPaymentCommand } from "../../application/record-renewal-payment.command"
import { ExecuteRenewalCommand } from "../../application/execute-renewal.command"
import { RecordRenewalOutcomeCommand } from "../../application/record-renewal-outcome.command"
import {
    CreateQuoteRequest,
    ExecuteRenewalRequest,
    ListOpenRenewalsRequest,
    RecordRenewalOutcomeRequest,
    RecordRenewalPaymentRequest,
    RenewalPathRequest,
    RenewalServicePathRequest,
} from "./dto/renewal.request"
import { RenewalPageResponse, RenewalResponse } from "./dto/renewal.response"
import {
    toExecuteRequest,
    toGetRequest,
    toListOpenRequest,
    toQuoteRequest,
    toRecordOutcomeRequest,
    toRecordPaymentRequest,
} from "./renewal.mapper"

@ApiTags("renewal")
@Controller()
@Credential({ kind: "api-key" })
/** The renewal doors, pay first: quote, payment recorded, provider step, a person's confirmation. */
export class RenewalController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `renewal.quote.create`: Open a renewal request awaiting payment on the customer's yes; the CRM computes total and transfer code (charges nothing). */
    @Post("v1/renewals")
    @CrmOperation({
        id: "renewal.quote.create",
        summary:
            "Open a renewal request awaiting payment on the customer's yes; the CRM computes total and transfer code (charges nothing).",
        response: RenewalResponse,
        effect: "write",
        nivoEffect: "none",
        idempotencyKey: true,
        status: 201,
    })
    quote(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Body() body: CreateQuoteRequest,
    ): Promise<RenewalResponse> {
        return this.commandBus.execute(
            new CreateQuoteCommand({ request: toQuoteRequest(workspaceId, requestKey, body) }),
        )
    }

    /** `renewal.open.list`: List the open renewal requests (awaiting payment, paid, waiting for a person). */
    @Get("v1/renewals/open")
    @CrmOperation({
        id: "renewal.open.list",
        summary: "List the open renewal requests (awaiting payment, paid, waiting for a person).",
        response: RenewalPageResponse,
        effect: "read",
    })
    listOpen(
        @CrmWorkspace() workspaceId: string,
        @Query() query: ListOpenRenewalsRequest,
    ): Promise<RenewalPageResponse> {
        return this.queryBus.execute(new ListOpenRenewalsQuery({ request: toListOpenRequest(workspaceId, query) }))
    }

    /** `renewal.get`: Get one renewal request with its state, total, payment code and payment reference. */
    @Get("v1/renewals/:id")
    @CrmOperation({
        id: "renewal.get",
        summary: "Get one renewal request with its state, total, payment code and payment reference.",
        response: RenewalResponse,
        effect: "read",
    })
    get(@CrmWorkspace() workspaceId: string, @Param() path: RenewalPathRequest): Promise<RenewalResponse> {
        return this.queryBus.execute(new GetRenewalQuery({ request: toGetRequest(workspaceId, path) }))
    }

    /** `renewal.payment.record`: Mark a renewal request paid by the bank transaction that proves it, never an amount (moves no money). */
    @Post("v1/renewals/:id/payments")
    @CrmOperation({
        id: "renewal.payment.record",
        summary:
            "Mark a renewal request paid by the bank transaction that proves it, never an amount (moves no money).",
        response: RenewalResponse,
        effect: "write",
        nivoEffect: "none",
    })
    recordPayment(
        @CrmWorkspace() workspaceId: string,
        @Param() path: RenewalPathRequest,
        @Body() body: RecordRenewalPaymentRequest,
    ): Promise<RenewalResponse> {
        return this.commandBus.execute(
            new RecordRenewalPaymentCommand({ request: toRecordPaymentRequest(workspaceId, path, body) }),
        )
    }

    /** `service.renewal.create`: Renew a service at its provider for a PAID request (COSTS MONEY once a live plugin exists; dryRun defaults to true). */
    @Post("v1/services/:code/renewals")
    @CrmOperation({
        id: "service.renewal.create",
        summary:
            "Renew a service at its provider for a PAID request (COSTS MONEY once a live plugin exists; dryRun defaults to true).",
        response: RenewalResponse,
        effect: "write",
        nivoEffect: "money",
        idempotencyKey: true,
    })
    execute(
        @CrmWorkspace() workspaceId: string,
        @CrmIdempotencyKey() requestKey: string,
        @Param() path: RenewalServicePathRequest,
        @Body() body: ExecuteRenewalRequest,
    ): Promise<RenewalResponse> {
        return this.commandBus.execute(
            new ExecuteRenewalCommand({ request: toExecuteRequest(workspaceId, requestKey, path, body) }),
        )
    }

    /** `renewal.outcome.record`: A person confirms the provider outcome: renewed (moves the service's end date) or failed. */
    @Post("v1/renewals/:id/outcome")
    @CrmOperation({
        id: "renewal.outcome.record",
        summary: "A person confirms the provider outcome: renewed (moves the service's end date) or failed.",
        response: RenewalResponse,
        effect: "write",
        nivoEffect: "irreversible",
    })
    recordOutcome(
        @CrmWorkspace() workspaceId: string,
        @Param() path: RenewalPathRequest,
        @Body() body: RecordRenewalOutcomeRequest,
    ): Promise<RenewalResponse> {
        return this.commandBus.execute(
            new RecordRenewalOutcomeCommand({ request: toRecordOutcomeRequest(workspaceId, path, body) }),
        )
    }
}

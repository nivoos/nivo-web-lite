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
import { RecordRenewalOutcomeCommand } from "../../application/record-renewal-outcome.command"
import {
    CreateQuoteRequest,
    ListOpenRenewalsRequest,
    RecordRenewalOutcomeRequest,
    RecordRenewalPaymentRequest,
    RenewalPathRequest,
} from "./dto/renewal.request"
import { RenewalPageResponse, RenewalResponse } from "./dto/renewal.response"
import {
    toGetRequest,
    toListOpenRequest,
    toQuoteRequest,
    toRecordOutcomeRequest,
    toRecordPaymentRequest,
} from "./renewal.mapper"

@ApiTags("renewal")
@Controller()
@Credential({ kind: "api-key" })
/** The renewal doors, pay first, as RECORDS: quote, payment recorded, the provider's answer recorded (the CRM renews nothing). */
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
        customerAudience: { parameter: null },
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

    /** `renewal.open.list`: List the open renewal requests (awaiting payment, paid, a pending provider answer waiting for a person). */
    @Get("v1/renewals/open")
    @CrmOperation({
        id: "renewal.open.list",
        summary:
            "List the open renewal requests (awaiting payment, paid, a pending provider answer waiting for a person).",
        response: RenewalPageResponse,
        effect: "read",
        customerAudience: { parameter: "customerCode" },
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

    /** `renewal.outcome.record`: Record what the provider answered for a paid renewal: renewed (moves the service's end date), failed or pending, with its reference. */
    @Post("v1/renewals/:id/outcome")
    @CrmOperation({
        id: "renewal.outcome.record",
        summary:
            "Record what the provider answered for a paid renewal: renewed (moves the service's end date), failed or pending, with its reference.",
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

import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { CreateCustomerCommand } from "../../application/create-customer.command"
import { CreatePurchaseCommand } from "../../application/create-purchase.command"
import { CreatePurchaseQuoteCommand } from "../../application/create-purchase-quote.command"
import { GetPurchaseQuery } from "../../application/get-purchase.query"
import { ListOpenPurchasesQuery } from "../../application/list-open-purchases.query"
import { RecordAcceptanceCommand } from "../../application/record-acceptance.command"
import { RecordFollowUpCommand } from "../../application/record-follow-up.command"
import { RecordPurchaseOutcomeCommand } from "../../application/record-purchase-outcome.command"
import { RecordPurchasePaymentCommand } from "../../application/record-purchase-payment.command"
import { UpdatePurchaseCommand } from "../../application/update-purchase.command"
import {
    CreateCustomerRequest,
    CreatePurchaseQuoteRequest,
    CreatePurchaseRequest,
    ListOpenPurchasesRequest,
    PurchasePathRequest,
    RecordAcceptanceRequest,
    RecordFollowUpRequest,
    RecordPurchaseOutcomeRequest,
    RecordPurchasePaymentRequest,
    UpdatePurchaseRequest,
} from "./dto/purchase.request"
import {
    AcceptanceResponse,
    CustomerCreatedResponse,
    PurchaseResponse,
    PurchaseSummaryPageResponse,
} from "./dto/purchase.response"
import {
    toAcceptRequest,
    toCreateCustomerRequest,
    toCreateRequest,
    toFollowUpRequest,
    toGetRequest,
    toListOpenRequest,
    toOutcomeRequest,
    toPaymentRequest,
    toQuoteRequest,
    toUpdateRequest,
} from "./purchase.mapper"

@ApiTags("purchase")
@Controller()
@Credential({ kind: "api-key" })
/** The doors of a NEW sale (AGENTS-GRAPHS §9.7): enquiry, quote from the table, follow-ups, customer, acceptance, payment, outcome. */
export class PurchaseController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `purchase.open.list` (declared before `purchase.get` so `open` is never read as an id). */
    @Get("v1/purchases/open")
    @CrmOperation({
        id: "purchase.open.list",
        summary: "List the open purchases with their quote and follow-up facts, optionally of one state or one source.",
        response: PurchaseSummaryPageResponse,
        effect: "read",
    })
    listOpen(
        @CrmWorkspace() workspaceId: string,
        @Query() query: ListOpenPurchasesRequest,
    ): Promise<PurchaseSummaryPageResponse> {
        return this.queryBus.execute(new ListOpenPurchasesQuery({ request: toListOpenRequest(workspaceId, query) }))
    }

    /** `purchase.create`: opens a purchase in state `enquiry`, or answers the open one of the same source. */
    @Post("v1/purchases")
    @CrmOperation({
        id: "purchase.create",
        summary:
            "Open a purchase for a new enquiry (state enquiry); the open purchase of the same channel and source is answered.",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "none",
        customerAudience: { parameter: null },
        status: 201,
    })
    create(@CrmWorkspace() workspaceId: string, @Body() body: CreatePurchaseRequest): Promise<PurchaseResponse> {
        return this.commandBus.execute(new CreatePurchaseCommand({ request: toCreateRequest(workspaceId, body) }))
    }

    /** `purchase.update`: the need, the contact as said, or `lost` with a note. */
    @Patch("v1/purchases/:id")
    @CrmOperation({
        id: "purchase.update",
        summary: "Change the need or the contact as said, or mark the purchase lost with a note; no other state move.",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "none",
        customerAudience: { parameter: null },
    })
    update(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: UpdatePurchaseRequest,
    ): Promise<PurchaseResponse> {
        return this.commandBus.execute(new UpdatePurchaseCommand({ request: toUpdateRequest(workspaceId, path, body) }))
    }

    /** `purchase.get`: one purchase. */
    @Get("v1/purchases/:id")
    @CrmOperation({
        id: "purchase.get",
        summary: "Get one purchase with its quote, state, payment code and reference, follow-ups and opened records.",
        response: PurchaseResponse,
        effect: "read",
        customerAudience: { parameter: null },
    })
    get(@CrmWorkspace() workspaceId: string, @Param() path: PurchasePathRequest): Promise<PurchaseResponse> {
        return this.queryBus.execute(new GetPurchaseQuery({ request: toGetRequest(workspaceId, path) }))
    }

    /** `purchase.quote.create`: a quote from the price table; the CRM computes every amount. */
    @Post("v1/purchases/:id/quotes")
    @CrmOperation({
        id: "purchase.quote.create",
        summary: "Quote a purchase from the price table (the CRM computes every amount); the purchase moves to quoted.",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "none",
        customerAudience: { parameter: null },
        status: 201,
    })
    quote(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: CreatePurchaseQuoteRequest,
    ): Promise<PurchaseResponse> {
        return this.commandBus.execute(
            new CreatePurchaseQuoteCommand({ request: toQuoteRequest(workspaceId, path, body) }),
        )
    }

    /** `purchase.followup.record`: today's follow-up (one a day). */
    @Post("v1/purchases/:id/followups")
    @CrmOperation({
        id: "purchase.followup.record",
        summary: "Record today's follow-up of an open purchase (one a day; a second one the same day replaces it).",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "none",
    })
    followUp(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: RecordFollowUpRequest,
    ): Promise<PurchaseResponse> {
        return this.commandBus.execute(
            new RecordFollowUpCommand({ request: toFollowUpRequest(workspaceId, path, body) }),
        )
    }

    /** `customer.create`: a new customer of the books for a purchase. */
    @Post("v1/customers")
    @CrmOperation({
        id: "customer.create",
        summary:
            "Open a customer of the books for a purchase; a customer with the same tax id, phone or mail is refused with its code.",
        response: CustomerCreatedResponse,
        effect: "write",
        nivoEffect: "irreversible",
        status: 201,
    })
    createCustomer(
        @CrmWorkspace() workspaceId: string,
        @Body() body: CreateCustomerRequest,
    ): Promise<CustomerCreatedResponse> {
        return this.commandBus.execute(
            new CreateCustomerCommand({ request: toCreateCustomerRequest(workspaceId, body) }),
        )
    }

    /** `purchase.accept.record`: the customer's acceptance of the quote opens the records of the sale. */
    @Post("v1/purchases/:id/acceptance")
    @CrmOperation({
        id: "purchase.accept.record",
        summary:
            "Record the acceptance of the quote: open the project, services, contract record, receivable and payment code (dry by default).",
        response: AcceptanceResponse,
        effect: "write",
        nivoEffect: "irreversible",
    })
    accept(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: RecordAcceptanceRequest,
    ): Promise<AcceptanceResponse> {
        return this.commandBus.execute(
            new RecordAcceptanceCommand({ request: toAcceptRequest(workspaceId, path, body) }),
        )
    }

    /** `purchase.payment.record`: the bank row proves the payment (no amount). */
    @Post("v1/purchases/:id/payments")
    @CrmOperation({
        id: "purchase.payment.record",
        summary:
            "Mark an accepted purchase paid by the bank row that proves it (no amount); a row used by another request is refused.",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "none",
    })
    recordPayment(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: RecordPurchasePaymentRequest,
    ): Promise<PurchaseResponse> {
        return this.commandBus.execute(
            new RecordPurchasePaymentCommand({ request: toPaymentRequest(workspaceId, path, body) }),
        )
    }

    /** `purchase.outcome.record`: a person's act. */
    @Post("v1/purchases/:id/outcome")
    @CrmOperation({
        id: "purchase.outcome.record",
        summary: "Record a person's outcome: delivered once paid, or cancelled while open.",
        response: PurchaseResponse,
        effect: "write",
        nivoEffect: "irreversible",
    })
    recordOutcome(
        @CrmWorkspace() workspaceId: string,
        @Param() path: PurchasePathRequest,
        @Body() body: RecordPurchaseOutcomeRequest,
    ): Promise<PurchaseResponse> {
        return this.commandBus.execute(
            new RecordPurchaseOutcomeCommand({ request: toOutcomeRequest(workspaceId, path, body) }),
        )
    }
}

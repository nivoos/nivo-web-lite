import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"
import type { CommandBus, QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectCommandBus, InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation, PageRequest } from "@modules/platform/openapi"
import { FindCustomerQuery } from "../../application/find-customer.query"
import { GetCustomerQuery } from "../../application/get-customer.query"
import { ListCustomerServicesQuery } from "../../application/list-customer-services.query"
import { ListCustomerContractsQuery } from "../../application/list-customer-contracts.query"
import { ListCustomerInvoicesQuery } from "../../application/list-customer-invoices.query"
import { ListCustomerDocumentsQuery } from "../../application/list-customer-documents.query"
import { GetCustomerBalanceQuery } from "../../application/get-customer-balance.query"
import { LinkContactCommand } from "../../application/link-contact.command"
import { CustomerPathRequest, FindCustomerRequest, LinkContactRequest } from "./dto/customer.request"
import {
    BalanceResponse,
    ContactLinkResponse,
    ContractPageResponse,
    CustomerPageResponse,
    CustomerResponse,
    CustomerServicePageResponse,
    DocumentPageResponse,
    InvoicePageResponse,
} from "./dto/customer.response"
import {
    toBalanceRequest,
    toFindRequest,
    toGetRequest,
    toLinkContactRequest,
    toListContractsRequest,
    toListDocumentsRequest,
    toListInvoicesRequest,
    toListServicesRequest,
} from "./customer.mapper"

@ApiTags("customer")
@Controller()
@Credential({ kind: "api-key" })
/** The customer doors: rows of the operation table NIVO's OpenAPI provider reads (REST by the declared contract, BE-TRANSPORT-1). */
export class CustomerController {
    constructor(
        @InjectQueryBus() private readonly queryBus: QueryBus,
        @InjectCommandBus() private readonly commandBus: CommandBus,
    ) {}

    /** `customer.find`: Find customers by code, name, tax id, phone, e-mail or website domain. */
    @Get("v1/customers")
    @CrmOperation({
        id: "customer.find",
        summary: "Find customers by code, name, tax id, phone, e-mail or website domain.",
        response: CustomerPageResponse,
        effect: "read",
    })
    find(@CrmWorkspace() workspaceId: string, @Query() query: FindCustomerRequest): Promise<CustomerPageResponse> {
        return this.queryBus.execute(new FindCustomerQuery({ request: toFindRequest(workspaceId, query) }))
    }

    /** `customer.get`: Get one customer with its website domains and linked contacts. */
    @Get("v1/customers/:code")
    @CrmOperation({
        id: "customer.get",
        summary: "Get one customer with its website domains and linked contacts.",
        response: CustomerResponse,
        effect: "read",
    })
    get(@CrmWorkspace() workspaceId: string, @Param() path: CustomerPathRequest): Promise<CustomerResponse> {
        return this.queryBus.execute(new GetCustomerQuery({ request: toGetRequest(workspaceId, path) }))
    }

    /** `customer.service.list`: List a customer's recurring services (hosting, domain, SSL). */
    @Get("v1/customers/:code/services")
    @CrmOperation({
        id: "customer.service.list",
        summary: "List a customer's recurring services (hosting, domain, SSL).",
        response: CustomerServicePageResponse,
        effect: "read",
    })
    listServices(
        @CrmWorkspace() workspaceId: string,
        @Param() path: CustomerPathRequest,
        @Query() query: PageRequest,
    ): Promise<CustomerServicePageResponse> {
        return this.queryBus.execute(
            new ListCustomerServicesQuery({ request: toListServicesRequest(workspaceId, path, query) }),
        )
    }

    /** `customer.contract.list`: List a customer's contracts from the contract register. */
    @Get("v1/customers/:code/contracts")
    @CrmOperation({
        id: "customer.contract.list",
        summary: "List a customer's contracts from the contract register.",
        response: ContractPageResponse,
        effect: "read",
    })
    listContracts(
        @CrmWorkspace() workspaceId: string,
        @Param() path: CustomerPathRequest,
        @Query() query: PageRequest,
    ): Promise<ContractPageResponse> {
        return this.queryBus.execute(
            new ListCustomerContractsQuery({ request: toListContractsRequest(workspaceId, path, query) }),
        )
    }

    /** `customer.invoice.list`: List the VAT invoices issued to a customer. */
    @Get("v1/customers/:code/invoices")
    @CrmOperation({
        id: "customer.invoice.list",
        summary: "List the VAT invoices issued to a customer.",
        response: InvoicePageResponse,
        effect: "read",
    })
    listInvoices(
        @CrmWorkspace() workspaceId: string,
        @Param() path: CustomerPathRequest,
        @Query() query: PageRequest,
    ): Promise<InvoicePageResponse> {
        return this.queryBus.execute(
            new ListCustomerInvoicesQuery({ request: toListInvoicesRequest(workspaceId, path, query) }),
        )
    }

    /** `customer.document.list`: List a customer's document references (paths, never content). */
    @Get("v1/customers/:code/documents")
    @CrmOperation({
        id: "customer.document.list",
        summary: "List a customer's document references (paths, never content).",
        response: DocumentPageResponse,
        effect: "read",
    })
    listDocuments(
        @CrmWorkspace() workspaceId: string,
        @Param() path: CustomerPathRequest,
        @Query() query: PageRequest,
    ): Promise<DocumentPageResponse> {
        return this.queryBus.execute(
            new ListCustomerDocumentsQuery({ request: toListDocumentsRequest(workspaceId, path, query) }),
        )
    }

    /** `customer.balance.get`: Get a customer's TK131 balance and open project receivables, side by side (a TK131 balance is not a debt). */
    @Get("v1/customers/:code/balance")
    @CrmOperation({
        id: "customer.balance.get",
        summary:
            "Get a customer's TK131 balance and open project receivables, side by side (a TK131 balance is not a debt).",
        response: BalanceResponse,
        effect: "read",
    })
    balance(@CrmWorkspace() workspaceId: string, @Param() path: CustomerPathRequest): Promise<BalanceResponse> {
        return this.queryBus.execute(new GetCustomerBalanceQuery({ request: toBalanceRequest(workspaceId, path) }))
    }

    /** `customer.contact.update`: Link a Zalo id, e-mail or phone to a customer (writes crm_contacts; free; idempotent by address). */
    @Post("v1/customers/:code/contacts")
    @CrmOperation({
        id: "customer.contact.update",
        summary: "Link a Zalo id, e-mail or phone to a customer (writes crm_contacts; free; idempotent by address).",
        response: ContactLinkResponse,
        effect: "write",
    })
    linkContact(
        @CrmWorkspace() workspaceId: string,
        @Param() path: CustomerPathRequest,
        @Body() body: LinkContactRequest,
    ): Promise<ContactLinkResponse> {
        return this.commandBus.execute(
            new LinkContactCommand({ request: toLinkContactRequest(workspaceId, path, body) }),
        )
    }
}

import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./customer.module-definition"
import { GetCustomerHandler } from "./application/get-customer.handler"
import { FindCustomerHandler } from "./application/find-customer.handler"
import { ListCustomerServicesHandler } from "./application/list-customer-services.handler"
import { ListCustomerContractsHandler } from "./application/list-customer-contracts.handler"
import { ListCustomerInvoicesHandler } from "./application/list-customer-invoices.handler"
import { ListCustomerDocumentsHandler } from "./application/list-customer-documents.handler"
import { GetCustomerDocumentLinkHandler } from "./application/get-customer-document-link.handler"
import { GetCustomerBalanceHandler } from "./application/get-customer-balance.handler"
import { LinkContactHandler } from "./application/link-contact.handler"

@Module({
    providers: [
        GetCustomerHandler,
        FindCustomerHandler,
        ListCustomerServicesHandler,
        ListCustomerContractsHandler,
        ListCustomerInvoicesHandler,
        ListCustomerDocumentsHandler,
        GetCustomerDocumentLinkHandler,
        GetCustomerBalanceHandler,
        LinkContactHandler,
    ],
})
/** The customer feature: the handlers of its application. */
export class CustomerApiModule extends ConfigurableModuleClass {}

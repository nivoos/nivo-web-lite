import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService, type InvoiceView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListCustomerInvoicesQuery } from "./list-customer-invoices.query"

@QueryHandler(ListCustomerInvoicesQuery)
/** Lists a customer's VAT invoices. One delegating call; the domain service decides. */
export class ListCustomerInvoicesHandler extends ICQRSHandler<ListCustomerInvoicesQuery, Page<InvoiceView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: ListCustomerInvoicesQuery): Promise<Page<InvoiceView>> {
        return this.customerBookService.listInvoices(message.params.request)
    }
}

import { QueryHandler } from "@nestjs/cqrs"
import { InvoiceDraftsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type InvoiceListPage, ListInvoicesQuery } from "./list-invoices.query"

@QueryHandler(ListInvoicesQuery)
/** Lists the workspace's VAT invoices. One delegating call; the domain service decides. */
export class ListInvoicesHandler extends ICQRSHandler<ListInvoicesQuery, InvoiceListPage> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly invoiceDraftsService: InvoiceDraftsService,
    ) {
        super(logger)
    }

    protected override process(message: ListInvoicesQuery): Promise<InvoiceListPage> {
        return this.invoiceDraftsService.listInvoices(message.params.request)
    }
}

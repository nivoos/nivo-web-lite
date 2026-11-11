import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService, type DocumentView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListCustomerDocumentsQuery } from "./list-customer-documents.query"

@QueryHandler(ListCustomerDocumentsQuery)
/** Lists a customer's document references. One delegating call; the domain service decides. */
export class ListCustomerDocumentsHandler extends ICQRSHandler<ListCustomerDocumentsQuery, Page<DocumentView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: ListCustomerDocumentsQuery): Promise<Page<DocumentView>> {
        return this.customerBookService.listDocuments(message.params.request)
    }
}

import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type DocumentLink, GetCustomerDocumentLinkQuery } from "./get-customer-document-link.query"

@QueryHandler(GetCustomerDocumentLinkQuery)
/** Asks a short-lived download link of a stored original. One delegating call; the domain service decides. */
export class GetCustomerDocumentLinkHandler extends ICQRSHandler<GetCustomerDocumentLinkQuery, DocumentLink> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: GetCustomerDocumentLinkQuery): Promise<DocumentLink> {
        return this.customerBookService.documentLink(message.params.request)
    }
}

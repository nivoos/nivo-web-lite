import { QueryHandler } from "@nestjs/cqrs"
import { type InvoiceDraftView, InvoiceDraftsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetInvoiceDraftQuery } from "./get-invoice-draft.query"

@QueryHandler(GetInvoiceDraftQuery)
/** Reads one invoice draft. One delegating call; the domain service decides. */
export class GetInvoiceDraftHandler extends ICQRSHandler<GetInvoiceDraftQuery, InvoiceDraftView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly invoiceDraftsService: InvoiceDraftsService,
    ) {
        super(logger)
    }

    protected override process(message: GetInvoiceDraftQuery): Promise<InvoiceDraftView> {
        return this.invoiceDraftsService.get(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { type InvoiceDraftView, InvoiceDraftsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordIssuedInvoiceCommand } from "./record-issued-invoice.command"

@CommandHandler(RecordIssuedInvoiceCommand)
/** Records the e-invoice issued for a draft. One delegating call; the domain service decides. */
export class RecordIssuedInvoiceHandler extends ICQRSHandler<RecordIssuedInvoiceCommand, InvoiceDraftView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly invoiceDraftsService: InvoiceDraftsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordIssuedInvoiceCommand): Promise<InvoiceDraftView> {
        return this.invoiceDraftsService.recordIssued(message.params.request)
    }
}

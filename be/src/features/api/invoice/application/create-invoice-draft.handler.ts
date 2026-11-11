import { CommandHandler } from "@nestjs/cqrs"
import { type InvoiceDraftView, InvoiceDraftsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { CreateInvoiceDraftCommand } from "./create-invoice-draft.command"

@CommandHandler(CreateInvoiceDraftCommand)
/** Drafts the invoice of a paid renewal. One delegating call; the domain service decides. */
export class CreateInvoiceDraftHandler extends ICQRSHandler<CreateInvoiceDraftCommand, InvoiceDraftView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly invoiceDraftsService: InvoiceDraftsService,
    ) {
        super(logger)
    }

    protected override process(message: CreateInvoiceDraftCommand): Promise<InvoiceDraftView> {
        return this.invoiceDraftsService.create(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type CreatePurchaseQuoteResult, CreatePurchaseQuoteCommand } from "./create-purchase-quote.command"

@CommandHandler(CreatePurchaseQuoteCommand)
/** Quotes a purchase from the price table. One delegating call; the domain service decides. */
export class CreatePurchaseQuoteHandler extends ICQRSHandler<CreatePurchaseQuoteCommand, CreatePurchaseQuoteResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: CreatePurchaseQuoteCommand): Promise<CreatePurchaseQuoteResult> {
        return this.purchasesService.quote(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type CreatePurchaseResult, CreatePurchaseCommand } from "./create-purchase.command"

@CommandHandler(CreatePurchaseCommand)
/** Opens a purchase for an enquiry, or answers the open one of the same source. One delegating call; the domain service decides. */
export class CreatePurchaseHandler extends ICQRSHandler<CreatePurchaseCommand, CreatePurchaseResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: CreatePurchaseCommand): Promise<CreatePurchaseResult> {
        return this.purchasesService.create(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type UpdatePurchaseResult, UpdatePurchaseCommand } from "./update-purchase.command"

@CommandHandler(UpdatePurchaseCommand)
/** Changes the need or the contact as said, or marks the purchase lost. One delegating call; the domain service decides. */
export class UpdatePurchaseHandler extends ICQRSHandler<UpdatePurchaseCommand, UpdatePurchaseResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: UpdatePurchaseCommand): Promise<UpdatePurchaseResult> {
        return this.purchasesService.update(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type RecordPurchaseOutcomeResult, RecordPurchaseOutcomeCommand } from "./record-purchase-outcome.command"

@CommandHandler(RecordPurchaseOutcomeCommand)
/** Records a person's outcome of a purchase. One delegating call; the domain service decides. */
export class RecordPurchaseOutcomeHandler extends ICQRSHandler<
    RecordPurchaseOutcomeCommand,
    RecordPurchaseOutcomeResult
> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: RecordPurchaseOutcomeCommand): Promise<RecordPurchaseOutcomeResult> {
        return this.purchasesService.recordOutcome(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type RecordAcceptanceResult, RecordAcceptanceCommand } from "./record-acceptance.command"

@CommandHandler(RecordAcceptanceCommand)
/** Records the customer's acceptance of the quote. One delegating call; the domain service decides. */
export class RecordAcceptanceHandler extends ICQRSHandler<RecordAcceptanceCommand, RecordAcceptanceResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: RecordAcceptanceCommand): Promise<RecordAcceptanceResult> {
        return this.purchasesService.accept(message.params.request)
    }
}

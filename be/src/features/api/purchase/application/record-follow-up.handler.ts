import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type RecordFollowUpResult, RecordFollowUpCommand } from "./record-follow-up.command"

@CommandHandler(RecordFollowUpCommand)
/** Records today's follow-up of a purchase. One delegating call; the domain service decides. */
export class RecordFollowUpHandler extends ICQRSHandler<RecordFollowUpCommand, RecordFollowUpResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: RecordFollowUpCommand): Promise<RecordFollowUpResult> {
        return this.purchasesService.followUp(message.params.request)
    }
}

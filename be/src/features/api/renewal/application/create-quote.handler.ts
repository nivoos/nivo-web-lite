import { CommandHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { CreateQuoteCommand } from "./create-quote.command"

@CommandHandler(CreateQuoteCommand)
/** Opens a renewal request awaiting payment. One delegating call; the domain service decides. */
export class CreateQuoteHandler extends ICQRSHandler<CreateQuoteCommand, RenewalView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: CreateQuoteCommand): Promise<RenewalView> {
        return this.renewalsService.quote(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordRenewalOutcomeCommand } from "./record-renewal-outcome.command"

@CommandHandler(RecordRenewalOutcomeCommand)
/** Records a person's confirmation of a renewal. One delegating call; the domain service decides. */
export class RecordRenewalOutcomeHandler extends ICQRSHandler<RecordRenewalOutcomeCommand, RenewalView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordRenewalOutcomeCommand): Promise<RenewalView> {
        return this.renewalsService.recordOutcome(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordRenewalPaymentCommand } from "./record-renewal-payment.command"

@CommandHandler(RecordRenewalPaymentCommand)
/** Marks a renewal paid by bank reference. One delegating call; the domain service decides. */
export class RecordRenewalPaymentHandler extends ICQRSHandler<RecordRenewalPaymentCommand, RenewalView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordRenewalPaymentCommand): Promise<RenewalView> {
        return this.renewalsService.recordPayment(message.params.request)
    }
}

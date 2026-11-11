import { CommandHandler } from "@nestjs/cqrs"
import { CollectionsService, type ReceivablePaymentView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordReceivablePaymentCommand } from "./record-receivable-payment.command"

@CommandHandler(RecordReceivablePaymentCommand)
/** Records a receivable's payment by bank reference. One delegating call; the domain service decides. */
export class RecordReceivablePaymentHandler extends ICQRSHandler<
    RecordReceivablePaymentCommand,
    ReceivablePaymentView
> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly collectionsService: CollectionsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordReceivablePaymentCommand): Promise<ReceivablePaymentView> {
        return this.collectionsService.recordReceivablePayment(message.params.request)
    }
}

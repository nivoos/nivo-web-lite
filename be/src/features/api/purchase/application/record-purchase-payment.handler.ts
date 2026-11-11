import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type RecordPurchasePaymentResult, RecordPurchasePaymentCommand } from "./record-purchase-payment.command"

@CommandHandler(RecordPurchasePaymentCommand)
/** Marks a purchase paid by the bank row. One delegating call; the domain service decides. */
export class RecordPurchasePaymentHandler extends ICQRSHandler<
    RecordPurchasePaymentCommand,
    RecordPurchasePaymentResult
> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: RecordPurchasePaymentCommand): Promise<RecordPurchasePaymentResult> {
        return this.purchasesService.recordPayment(message.params.request)
    }
}

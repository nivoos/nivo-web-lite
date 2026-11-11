import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { ReceivablePaymentInput, ReceivablePaymentView } from "@modules/domain/crm"

/** Records a receivable's payment by bank reference. */
export class RecordReceivablePaymentCommand extends Command<ReceivablePaymentView> {
    constructor(readonly params: PublicExecuteParams<ReceivablePaymentInput>) {
        super()
    }
}

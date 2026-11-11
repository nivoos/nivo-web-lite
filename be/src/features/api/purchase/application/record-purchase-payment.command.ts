import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.recordPayment` takes. */
export type RecordPurchasePaymentInput = Parameters<PurchasesService["recordPayment"]>[0]

/** What `PurchasesService.recordPayment` answers. */
export type RecordPurchasePaymentResult = Awaited<ReturnType<PurchasesService["recordPayment"]>>

/** Marks a purchase paid by the bank row. */
export class RecordPurchasePaymentCommand extends Command<RecordPurchasePaymentResult> {
    constructor(readonly params: PublicExecuteParams<RecordPurchasePaymentInput>) {
        super()
    }
}

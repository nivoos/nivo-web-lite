import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.recordOutcome` takes. */
export type RecordPurchaseOutcomeInput = Parameters<PurchasesService["recordOutcome"]>[0]

/** What `PurchasesService.recordOutcome` answers. */
export type RecordPurchaseOutcomeResult = Awaited<ReturnType<PurchasesService["recordOutcome"]>>

/** Records a person's outcome of a purchase. */
export class RecordPurchaseOutcomeCommand extends Command<RecordPurchaseOutcomeResult> {
    constructor(readonly params: PublicExecuteParams<RecordPurchaseOutcomeInput>) {
        super()
    }
}

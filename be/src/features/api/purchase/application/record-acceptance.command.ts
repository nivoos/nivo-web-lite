import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.accept` takes. */
export type RecordAcceptanceInput = Parameters<PurchasesService["accept"]>[0]

/** What `PurchasesService.accept` answers. */
export type RecordAcceptanceResult = Awaited<ReturnType<PurchasesService["accept"]>>

/** Records the customer's acceptance of the quote. */
export class RecordAcceptanceCommand extends Command<RecordAcceptanceResult> {
    constructor(readonly params: PublicExecuteParams<RecordAcceptanceInput>) {
        super()
    }
}

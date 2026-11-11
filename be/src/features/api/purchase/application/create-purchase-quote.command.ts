import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.quote` takes. */
export type CreatePurchaseQuoteInput = Parameters<PurchasesService["quote"]>[0]

/** What `PurchasesService.quote` answers. */
export type CreatePurchaseQuoteResult = Awaited<ReturnType<PurchasesService["quote"]>>

/** Quotes a purchase from the price table. */
export class CreatePurchaseQuoteCommand extends Command<CreatePurchaseQuoteResult> {
    constructor(readonly params: PublicExecuteParams<CreatePurchaseQuoteInput>) {
        super()
    }
}

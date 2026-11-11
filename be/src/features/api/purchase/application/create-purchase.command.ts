import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.create` takes. */
export type CreatePurchaseInput = Parameters<PurchasesService["create"]>[0]

/** What `PurchasesService.create` answers. */
export type CreatePurchaseResult = Awaited<ReturnType<PurchasesService["create"]>>

/** Opens a purchase for an enquiry, or answers the open one of the same source. */
export class CreatePurchaseCommand extends Command<CreatePurchaseResult> {
    constructor(readonly params: PublicExecuteParams<CreatePurchaseInput>) {
        super()
    }
}

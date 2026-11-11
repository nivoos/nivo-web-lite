import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.update` takes. */
export type UpdatePurchaseInput = Parameters<PurchasesService["update"]>[0]

/** What `PurchasesService.update` answers. */
export type UpdatePurchaseResult = Awaited<ReturnType<PurchasesService["update"]>>

/** Changes the need or the contact as said, or marks the purchase lost. */
export class UpdatePurchaseCommand extends Command<UpdatePurchaseResult> {
    constructor(readonly params: PublicExecuteParams<UpdatePurchaseInput>) {
        super()
    }
}

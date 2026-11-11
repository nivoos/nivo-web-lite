import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.get` takes. */
export type GetPurchaseInput = Parameters<PurchasesService["get"]>[0]

/** What `PurchasesService.get` answers. */
export type GetPurchaseResult = Awaited<ReturnType<PurchasesService["get"]>>

/** Reads one purchase with its quote and follow-ups. */
export class GetPurchaseQuery extends Query<GetPurchaseResult> {
    constructor(readonly params: PublicExecuteParams<GetPurchaseInput>) {
        super()
    }
}

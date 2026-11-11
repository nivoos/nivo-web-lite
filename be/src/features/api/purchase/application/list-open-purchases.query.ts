import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.listOpen` takes. */
export type ListOpenPurchasesInput = Parameters<PurchasesService["listOpen"]>[0]

/** What `PurchasesService.listOpen` answers. */
export type ListOpenPurchasesResult = Awaited<ReturnType<PurchasesService["listOpen"]>>

/** Lists the open purchases with their follow-up facts. */
export class ListOpenPurchasesQuery extends Query<ListOpenPurchasesResult> {
    constructor(readonly params: PublicExecuteParams<ListOpenPurchasesInput>) {
        super()
    }
}

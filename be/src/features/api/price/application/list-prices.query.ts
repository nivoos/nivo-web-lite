import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `price.list` reads: the calling workspace, an optional kind (a NEW sale or a renewal), the page. */
export type PriceListInput = Parameters<PurchasesService["listPrices"]>[0]

/** One page of price rows. */
export type PricePage = Awaited<ReturnType<PurchasesService["listPrices"]>>

/** One row of the price table. */
export type PriceRow = PricePage["items"][number]

/** Lists the price table. */
export class ListPricesQuery extends Query<PricePage> {
    constructor(readonly params: PublicExecuteParams<PriceListInput>) {
        super()
    }
}

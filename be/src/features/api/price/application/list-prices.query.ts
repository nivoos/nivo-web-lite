import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { PriceListInput, PriceView } from "@modules/domain/crm"

/** Lists the price table. */
export class ListPricesQuery extends Query<Page<PriceView>> {
    constructor(readonly params: PublicExecuteParams<PriceListInput>) {
        super()
    }
}

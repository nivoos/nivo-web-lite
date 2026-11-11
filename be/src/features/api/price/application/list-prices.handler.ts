import { QueryHandler } from "@nestjs/cqrs"
import { type PriceView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListPricesQuery } from "./list-prices.query"

@QueryHandler(ListPricesQuery)
/** Lists the price table. One delegating call; the domain service decides. */
export class ListPricesHandler extends ICQRSHandler<ListPricesQuery, Page<PriceView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: ListPricesQuery): Promise<Page<PriceView>> {
        return this.renewalsService.listPrices(message.params.request)
    }
}

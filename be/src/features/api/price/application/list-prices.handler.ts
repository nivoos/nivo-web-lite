import { QueryHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { ListPricesQuery, type PricePage } from "./list-prices.query"

@QueryHandler(ListPricesQuery)
/** Lists the price table. One delegating call; the domain service decides. */
export class ListPricesHandler extends ICQRSHandler<ListPricesQuery, PricePage> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: ListPricesQuery): Promise<PricePage> {
        return this.purchasesService.listPrices(message.params.request)
    }
}

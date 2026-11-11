import { QueryHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type ListOpenPurchasesResult, ListOpenPurchasesQuery } from "./list-open-purchases.query"

@QueryHandler(ListOpenPurchasesQuery)
/** Lists the open purchases with their follow-up facts. One delegating call; the domain service decides. */
export class ListOpenPurchasesHandler extends ICQRSHandler<ListOpenPurchasesQuery, ListOpenPurchasesResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: ListOpenPurchasesQuery): Promise<ListOpenPurchasesResult> {
        return this.purchasesService.listOpen(message.params.request)
    }
}

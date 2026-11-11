import { QueryHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type GetPurchaseResult, GetPurchaseQuery } from "./get-purchase.query"

@QueryHandler(GetPurchaseQuery)
/** Reads one purchase with its quote and follow-ups. One delegating call; the domain service decides. */
export class GetPurchaseHandler extends ICQRSHandler<GetPurchaseQuery, GetPurchaseResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: GetPurchaseQuery): Promise<GetPurchaseResult> {
        return this.purchasesService.get(message.params.request)
    }
}

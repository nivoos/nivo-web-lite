import { QueryHandler } from "@nestjs/cqrs"
import { CollectionsService, type PayableView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListPayablesQuery } from "./list-payables.query"

@QueryHandler(ListPayablesQuery)
/** Lists the TK331 parties. One delegating call; the domain service decides. */
export class ListPayablesHandler extends ICQRSHandler<ListPayablesQuery, Page<PayableView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly collectionsService: CollectionsService,
    ) {
        super(logger)
    }

    protected override process(message: ListPayablesQuery): Promise<Page<PayableView>> {
        return this.collectionsService.listPayables(message.params.request)
    }
}

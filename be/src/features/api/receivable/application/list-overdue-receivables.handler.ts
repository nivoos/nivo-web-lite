import { QueryHandler } from "@nestjs/cqrs"
import { CollectionsService, type ReceivableView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListOverdueReceivablesQuery } from "./list-overdue-receivables.query"

@QueryHandler(ListOverdueReceivablesQuery)
/** Lists the overdue real receivables. One delegating call; the domain service decides. */
export class ListOverdueReceivablesHandler extends ICQRSHandler<ListOverdueReceivablesQuery, Page<ReceivableView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly collectionsService: CollectionsService,
    ) {
        super(logger)
    }

    protected override process(message: ListOverdueReceivablesQuery): Promise<Page<ReceivableView>> {
        return this.collectionsService.listOverdue(message.params.request)
    }
}

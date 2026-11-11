import { QueryHandler } from "@nestjs/cqrs"
import { type TicketSummaryView, TicketsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListTicketsQuery } from "./list-tickets.query"

@QueryHandler(ListTicketsQuery)
/** Lists tickets newest first. One delegating call; the domain service decides. */
export class ListTicketsHandler extends ICQRSHandler<ListTicketsQuery, Page<TicketSummaryView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly ticketsService: TicketsService,
    ) {
        super(logger)
    }

    protected override process(message: ListTicketsQuery): Promise<Page<TicketSummaryView>> {
        return this.ticketsService.list(message.params.request)
    }
}

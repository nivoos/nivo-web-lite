import { QueryHandler } from "@nestjs/cqrs"
import { type TicketView, TicketsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetTicketQuery } from "./get-ticket.query"

@QueryHandler(GetTicketQuery)
/** Reads one ticket with its notes. One delegating call; the domain service decides. */
export class GetTicketHandler extends ICQRSHandler<GetTicketQuery, TicketView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly ticketsService: TicketsService,
    ) {
        super(logger)
    }

    protected override process(message: GetTicketQuery): Promise<TicketView> {
        return this.ticketsService.get(message.params.request)
    }
}

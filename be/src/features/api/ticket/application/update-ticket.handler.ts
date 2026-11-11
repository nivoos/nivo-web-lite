import { CommandHandler } from "@nestjs/cqrs"
import { type TicketView, TicketsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { UpdateTicketCommand } from "./update-ticket.command"

@CommandHandler(UpdateTicketCommand)
/** Adds a note to a ticket and/or moves its status. One delegating call; the domain service decides. */
export class UpdateTicketHandler extends ICQRSHandler<UpdateTicketCommand, TicketView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly ticketsService: TicketsService,
    ) {
        super(logger)
    }

    protected override process(message: UpdateTicketCommand): Promise<TicketView> {
        return this.ticketsService.update(message.params.request)
    }
}

import { CommandHandler } from "@nestjs/cqrs"
import { type TicketView, TicketsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { CreateTicketCommand } from "./create-ticket.command"

@CommandHandler(CreateTicketCommand)
/** Opens a ticket. One delegating call; the domain service decides. */
export class CreateTicketHandler extends ICQRSHandler<CreateTicketCommand, TicketView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly ticketsService: TicketsService,
    ) {
        super(logger)
    }

    protected override process(message: CreateTicketCommand): Promise<TicketView> {
        return this.ticketsService.create(message.params.request)
    }
}

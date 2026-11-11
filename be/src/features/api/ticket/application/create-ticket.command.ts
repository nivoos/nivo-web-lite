import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { TicketCreateInput, TicketView } from "@modules/domain/crm"

/** Opens a ticket. */
export class CreateTicketCommand extends Command<TicketView> {
    constructor(readonly params: PublicExecuteParams<TicketCreateInput>) {
        super()
    }
}

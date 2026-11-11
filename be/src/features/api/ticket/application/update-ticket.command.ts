import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { TicketUpdateInput, TicketView } from "@modules/domain/crm"

/** Adds a note to a ticket and/or moves its status. */
export class UpdateTicketCommand extends Command<TicketView> {
    constructor(readonly params: PublicExecuteParams<TicketUpdateInput>) {
        super()
    }
}

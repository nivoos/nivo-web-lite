import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./ticket.module-definition"
import { CreateTicketHandler } from "./application/create-ticket.handler"
import { GetTicketHandler } from "./application/get-ticket.handler"
import { ListTicketsHandler } from "./application/list-tickets.handler"
import { UpdateTicketHandler } from "./application/update-ticket.handler"

@Module({ providers: [CreateTicketHandler, GetTicketHandler, ListTicketsHandler, UpdateTicketHandler] })
/** The ticket feature: the handlers of its application. */
export class TicketApiModule extends ConfigurableModuleClass {}

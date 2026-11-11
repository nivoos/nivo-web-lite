import { Module } from "@nestjs/common"
import { TicketApiModule } from "../../ticket.module"
import { ConfigurableModuleClass } from "./ticket-http.module-definition"
import { TicketController } from "./ticket.controller"

@Module({ imports: [TicketApiModule.register({})], controllers: [TicketController] })
/** The ticket HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class TicketHttpModule extends ConfigurableModuleClass {}

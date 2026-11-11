import { defineConfigurableModule } from "@starci/nest-kit"
import type { TicketApiOptions } from "./ticket.options"

/** The configurable-module base of the ticket feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<TicketApiOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { TicketHttpOptions } from "./ticket-http.options"

/** The configurable-module base of the ticket HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<TicketHttpOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { InvoiceHttpOptions } from "./invoice-http.options"

/** The configurable-module base of the invoice HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<InvoiceHttpOptions>()

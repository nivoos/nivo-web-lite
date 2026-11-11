import { defineConfigurableModule } from "@starci/nest-kit"
import type { InvoiceApiOptions } from "./invoice.options"

/** The configurable-module base of the invoice feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<InvoiceApiOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { CustomerHttpOptions } from "./customer-http.options"

/** The configurable-module base of the customer HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<CustomerHttpOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { CustomerApiOptions } from "./customer.options"

/** The configurable-module base of the customer feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<CustomerApiOptions>()

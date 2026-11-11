import { defineConfigurableModule } from "@starci/nest-kit"
import type { PurchaseHttpOptions } from "./purchase-http.options"

/** The configurable-module base of the purchase HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PurchaseHttpOptions>()

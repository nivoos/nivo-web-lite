import { defineConfigurableModule } from "@starci/nest-kit"
import type { PriceHttpOptions } from "./price-http.options"

/** The configurable-module base of the price HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PriceHttpOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { PriceApiOptions } from "./price.options"

/** The configurable-module base of the price feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PriceApiOptions>()

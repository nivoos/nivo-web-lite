import { defineConfigurableModule } from "@starci/nest-kit"
import type { PurchaseApiOptions } from "./purchase.options"

/** The configurable-module base of the purchase feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PurchaseApiOptions>()

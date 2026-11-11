import { defineConfigurableModule } from "@starci/nest-kit"
import type { PayableApiOptions } from "./payable.options"

/** The configurable-module base of the payable feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PayableApiOptions>()

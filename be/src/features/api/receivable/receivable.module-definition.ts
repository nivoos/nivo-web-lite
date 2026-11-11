import { defineConfigurableModule } from "@starci/nest-kit"
import type { ReceivableApiOptions } from "./receivable.options"

/** The configurable-module base of the receivable feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<ReceivableApiOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { RenewalApiOptions } from "./renewal.options"

/** The configurable-module base of the renewal feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<RenewalApiOptions>()

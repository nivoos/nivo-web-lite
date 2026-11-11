import { defineConfigurableModule } from "@starci/nest-kit"
import type { RenewalHttpOptions } from "./renewal-http.options"

/** The configurable-module base of the renewal HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<RenewalHttpOptions>()

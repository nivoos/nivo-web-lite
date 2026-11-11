import { defineConfigurableModule } from "@starci/nest-kit"
import type { PayableHttpOptions } from "./payable-http.options"

/** The configurable-module base of the payable HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<PayableHttpOptions>()

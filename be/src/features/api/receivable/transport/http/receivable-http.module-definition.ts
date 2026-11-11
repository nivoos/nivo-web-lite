import { defineConfigurableModule } from "@starci/nest-kit"
import type { ReceivableHttpOptions } from "./receivable-http.options"

/** The configurable-module base of the receivable HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<ReceivableHttpOptions>()

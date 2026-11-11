import { defineConfigurableModule } from "@starci/nest-kit"
import type { ServiceHttpOptions } from "./service-http.options"

/** The configurable-module base of the service HTTP transport. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<ServiceHttpOptions>()

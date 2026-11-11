import { defineConfigurableModule } from "@starci/nest-kit"
import type { ServiceApiOptions } from "./service.options"

/** The configurable-module base of the service feature. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<ServiceApiOptions>()

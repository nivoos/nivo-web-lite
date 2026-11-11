import { defineConfigurableModule } from "@starci/nest-kit"
import type { ImportOptions } from "./import.options"

/** The configurable-module base of the import module. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = defineConfigurableModule<ImportOptions>()

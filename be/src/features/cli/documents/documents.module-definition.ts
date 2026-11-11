import { defineConfigurableModule } from "@starci/nest-kit"
import type { DocumentsOptions } from "./documents.options"

/** The configurable-module base of the documents module. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<DocumentsOptions>()

import { defineConfigurableModule } from "@starci/nest-kit"
import type { CredentialOptions } from "./credential.options"

/** The configurable-module base of the credential module. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineConfigurableModule<CredentialOptions>()

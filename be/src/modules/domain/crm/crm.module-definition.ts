import { defineCapabilityModule } from "@starci/nest-kit"
import type { CrmOptions } from "./crm.options"

/** The configurable-module base of the CRM capability; `isGlobal` is decided by the app root. */
export const { ConfigurableModuleClass, OPTIONS_TYPE } = defineCapabilityModule<CrmOptions>()

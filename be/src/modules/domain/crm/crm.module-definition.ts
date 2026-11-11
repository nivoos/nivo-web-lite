import { defineCapabilityModule } from "@starci/nest-kit"
import { CRM_OPTIONS } from "./crm.decorators"
import type { CrmOptions } from "./crm.options"

/** The configurable-module base of the CRM capability; `isGlobal` is decided by the app root. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = defineCapabilityModule<CrmOptions>({
    optionsInjectionToken: CRM_OPTIONS,
})

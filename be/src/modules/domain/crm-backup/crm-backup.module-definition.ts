import { defineCapabilityModule } from "@starci/nest-kit"
import type { CrmBackupOptions } from "./crm-backup.options"

/** The configurable-module base of the CRM backup capability; `isGlobal` is decided by the app root. */
export const { ConfigurableModuleClass, OPTIONS_TYPE } = defineCapabilityModule<CrmBackupOptions>()

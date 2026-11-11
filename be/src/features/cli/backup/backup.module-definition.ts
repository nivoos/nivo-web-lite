import { defineConfigurableModule } from "@starci/nest-kit"
import type { BackupOptions } from "./backup.options"

/** The configurable-module base of the backup module. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = defineConfigurableModule<BackupOptions>()

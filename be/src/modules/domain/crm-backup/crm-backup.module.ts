import { Module, type DynamicModule } from "@nestjs/common"
import { BackupFilesClient } from "./backup-files.client"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./crm-backup.module-definition"
import { CrmBackupService } from "./crm-backup.service"

@Module({})
/** The table-shaped backup of the CRM tables (format @2), for the operator commands of the cli. */
export class CrmBackupModule extends ConfigurableModuleClass {
    /** Registers the capability once in the app root. */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const base = super.register(options)
        return {
            ...base,
            providers: [...(base.providers ?? []), BackupFilesClient, CrmBackupService],
            exports: [CrmBackupService],
        }
    }
}

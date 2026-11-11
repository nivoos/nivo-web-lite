import type { DynamicModule } from "@nestjs/common"
import { CrmModule } from "@modules/domain/crm"
import { CrmBackupModule } from "@modules/domain/crm-backup"

/** The domain capabilities the operator commands use: the CRM (its credentials) and the CRM backup. */
export const domainModules = (): Array<DynamicModule> => [
    CrmModule.register({ isGlobal: true }),
    CrmBackupModule.register({ isGlobal: true }),
]

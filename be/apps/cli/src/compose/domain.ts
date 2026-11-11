import type { DynamicModule } from "@nestjs/common"
import { CrmBackupModule } from "@modules/domain/crm-backup"

/** The domain capabilities the operator commands use: the CRM backup. */
export const domainModules = (): Array<DynamicModule> => [CrmBackupModule.register({ isGlobal: true })]

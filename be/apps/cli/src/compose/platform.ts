import type { DynamicModule } from "@nestjs/common"
import { ClockModule } from "@modules/platform/clock"
import { DatabaseModule } from "@modules/platform/database"
import { PRIMARY_ENTITIES } from "@modules/platform/database/entities"
import { I18nModule } from "@modules/platform/i18n"
import { IdsModule } from "@modules/platform/ids"
import { CRM_MESSAGES } from "@modules/domain/crm"
import { HttpModule } from "@modules/platform/http"
import { LoggingModule } from "@modules/platform/logging"
import type { CliAppOptions } from "../cli.options"

/** The shared clock, logger, message catalog and least-privilege connection used by the operator commands. */
export const platformModules = (options: CliAppOptions): Array<DynamicModule> => [
    ClockModule.register({ isGlobal: true }),
    IdsModule.register({ isGlobal: true }),
    LoggingModule.register({ isGlobal: true, info: "stderr" }),
    HttpModule.register({ isGlobal: true }),
    I18nModule.register({ isGlobal: true, bundles: [CRM_MESSAGES] }),
    DatabaseModule.register({ isGlobal: true, connections: options.connections, entities: PRIMARY_ENTITIES }),
]

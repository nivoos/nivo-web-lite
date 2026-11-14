import type { DynamicModule } from "@nestjs/common"
import { ObjectStorageModule } from "@modules/integrations/object-storage"
import type { CliAppOptions } from "../cli.options"

/** The integrations the CRM capability needs in the cli: the private object storage. */
export const integrationModules = (options: CliAppOptions): Array<DynamicModule> => [
    ObjectStorageModule.register({ ...options.objectStorage, isGlobal: true }),
]

import type { DynamicModule } from "@nestjs/common"
import { ObjectStorageModule } from "@modules/integrations/object-storage"
import { RenewalProviderModule } from "@modules/integrations/renewal-provider"
import type { CliAppOptions } from "../cli.options"

/** The integrations the CRM capability needs in the cli: the renewal provider port and the private object storage. */
export const integrationModules = (options: CliAppOptions): Array<DynamicModule> => [
    RenewalProviderModule.register({ ...options.renewalProvider, isGlobal: true }),
    ObjectStorageModule.register({ ...options.objectStorage, isGlobal: true }),
]

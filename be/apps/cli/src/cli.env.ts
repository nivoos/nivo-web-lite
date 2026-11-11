import type { EnvSource } from "@modules/platform/config"
import { type DatabaseConnectionOptions, parsePrimaryDatabaseConfig } from "@modules/platform/database"
import { type RenewalProviderOptions, parseRenewalProviderConfig } from "@modules/integrations/renewal-provider"

/** The cli's configuration before command composition. */
export interface CliEnv {
    /** The least-privilege primary database connection, its URL read through the secret source. */
    readonly database: DatabaseConnectionOptions
    /** Which plugin takes each provider's renewals (`CRM_PROVIDER_PLUGINS`, a tunable): the CRM capability needs its port. */
    readonly renewalProvider: RenewalProviderOptions
}

/** Reads the cli environment; database secret readers prefer mounted files. */
export const readCliEnv = (env: EnvSource): CliEnv => ({
    database: parsePrimaryDatabaseConfig(env),
    renewalProvider: parseRenewalProviderConfig(env),
})

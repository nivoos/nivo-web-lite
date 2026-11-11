import type { DatabaseConnectionOptions } from "@modules/platform/database"
import type { ObjectStorageOptions } from "@modules/integrations/object-storage"
import type { RenewalProviderOptions } from "@modules/integrations/renewal-provider"
import type { CliEnv } from "./cli.env"

/** Everything the lite cli needs: the least-privilege PostgreSQL connection, the CRM's provider routing and the private storage. */
export interface CliAppOptions {
    /** The connections the built-in migrate and seed groups and the CRM commands operate on. */
    readonly connections: ReadonlyArray<DatabaseConnectionOptions>
    /** Which plugin takes each provider's renewals. */
    readonly renewalProvider: RenewalProviderOptions
    /** The private object storage of the document originals. */
    readonly objectStorage: ObjectStorageOptions
}

/** Uses the parsed connection without adding entities or TypeORM migrations. */
export const createCliAppOptions = (env: CliEnv): CliAppOptions => ({
    connections: [env.database],
    renewalProvider: env.renewalProvider,
    objectStorage: env.objectStorage,
})

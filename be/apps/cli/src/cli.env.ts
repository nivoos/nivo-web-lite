import type { EnvSource } from "@modules/platform/config"
import { type DatabaseConnectionOptions, parsePrimaryDatabaseConfig } from "@modules/platform/database"
import { type ObjectStorageOptions, parseObjectStorageConfig } from "@modules/integrations/object-storage"

/** The cli's configuration before command composition. */
export interface CliEnv {
    /** The least-privilege primary database connection, its URL read through the secret source. */
    readonly database: DatabaseConnectionOptions
    /** The private object storage of the document originals (`STORAGE_*`; the credentials read through `<KEY>_FILE`). */
    readonly objectStorage: ObjectStorageOptions
}

/** Reads the cli environment; database secret readers prefer mounted files. */
export const readCliEnv = (env: EnvSource): CliEnv => ({
    database: parsePrimaryDatabaseConfig(env),
    objectStorage: parseObjectStorageConfig(env),
})

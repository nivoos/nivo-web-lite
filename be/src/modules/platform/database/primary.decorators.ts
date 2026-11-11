import { injector, type TypedParameterDecorator } from "@modules/platform/composition"
import type { EntityManager } from "typeorm"
import type { DatabaseProbeService } from "./database-probe.service"
import type { MigrationCommand } from "./migration-runner.service"

/** Token of the shared EntityManager of the `primary` database; the database module provides it for the connection it opens. */
export const PRIMARY_ENTITY_MANAGER: unique symbol = Symbol("platform.database.primary-entity-manager")

/** Injects the shared EntityManager of the `primary` database. Parameter type: EntityManager. */
export const InjectPrimaryEntityManager = (): TypedParameterDecorator<EntityManager> =>
    injector<EntityManager>(PRIMARY_ENTITY_MANAGER)

/** The required primary database connectivity probe provided by the database capability. */
export const DATABASE_PROBE: unique symbol = Symbol("platform.database.probe")

/** Injects the primary database connectivity probe. Parameter type: DatabaseProbeService. */
export const InjectDatabaseProbe = (): TypedParameterDecorator<DatabaseProbeService> =>
    injector<DatabaseProbeService>(DATABASE_PROBE)

/** Token of the process a migration run starts; the database module provides the managed db:push wrapper. */
export const MIGRATION_COMMAND: unique symbol = Symbol("platform.database.migration-command")

/** Injects the process a migration run starts. Parameter type: MigrationCommand. */
export const InjectMigrationCommand = (): TypedParameterDecorator<MigrationCommand> =>
    injector<MigrationCommand>(MIGRATION_COMMAND)

/** Token of the folder seed paths are relative to; the database module provides the app root the run starts from. */
export const SEED_ROOT: unique symbol = Symbol("platform.database.seed-root")

/** Injects the folder seed paths are relative to. Parameter type: string. */
export const InjectSeedRoot = (): TypedParameterDecorator<string> => injector<string>(SEED_ROOT)

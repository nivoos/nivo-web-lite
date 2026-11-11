import { DomainError, type ErrorKind } from "@modules/platform/errors"

/** Codes of the database capability. */
export enum DatabaseErrorCode {
    /** A configured connection has no declared EntityManager injection token. */
    ConnectionUndeclared = "DATABASE_CONNECTION_UNDECLARED",
    /** A dynamic SQL identifier was not on the names its caller allows. */
    IdentifierRejected = "DATABASE_IDENTIFIER_REJECTED",
    /** A RETURNING statement answered something other than rows of the shape its caller expects. */
    ReturningRowRejected = "DATABASE_RETURNING_ROW_REJECTED",
    /** The managed migration wrapper (`npm run db:push`) did not finish with status 0 (`status` param, `none` without one), or could not start. */
    MigrationFailed = "DATABASE_MIGRATION_FAILED",
}

/** How each database code travels. */
export const DATABASE_ERROR_KINDS: Record<DatabaseErrorCode, ErrorKind> = {
    [DatabaseErrorCode.ConnectionUndeclared]: "internal",
    [DatabaseErrorCode.IdentifierRejected]: "internal",
    [DatabaseErrorCode.ReturningRowRejected]: "internal",
    [DatabaseErrorCode.MigrationFailed]: "internal",
}

/** The one error class of the database capability. */
export class DatabaseError extends DomainError<DatabaseErrorCode> {}

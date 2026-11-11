import { DomainError, type ErrorKind } from "@modules/platform/errors"

/** Codes of the CRM backup capability. */
export enum CrmBackupErrorCode {
    /** A backup directory has no `manifest.json`, or it is not a manifest of format `nivo-web-lite-data@2`. */
    ManifestInvalid = "CRM_BACKUP_MANIFEST_INVALID",
    /** A table file of the manifest is missing, or the manifest lists another set of tables than the database (`table` param). */
    TableMissing = "CRM_BACKUP_TABLE_MISSING",
    /** A table file is not the canonical text the manifest's sha256 and count name (`table` param). */
    DigestMismatch = "CRM_BACKUP_DIGEST_MISMATCH",
    /** A restore found rows already in the database (`table` param): a restore only fills an empty database. */
    DatabaseNotEmpty = "CRM_BACKUP_DATABASE_NOT_EMPTY",
    /** After the inserts a table holds another number of rows than its file (`table` param); the restore rolled back. */
    CountMismatch = "CRM_BACKUP_COUNT_MISMATCH",
}

/** How each backup code travels. */
export const CRM_BACKUP_ERROR_KINDS: Record<CrmBackupErrorCode, ErrorKind> = {
    [CrmBackupErrorCode.ManifestInvalid]: "invalid",
    [CrmBackupErrorCode.TableMissing]: "invalid",
    [CrmBackupErrorCode.DigestMismatch]: "invalid",
    [CrmBackupErrorCode.DatabaseNotEmpty]: "conflict",
    [CrmBackupErrorCode.CountMismatch]: "internal",
}

/** The one error class of the CRM backup capability. */
export class CrmBackupError extends DomainError<CrmBackupErrorCode> {}

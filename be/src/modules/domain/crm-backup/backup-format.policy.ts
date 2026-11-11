import { isRecord } from "@modules/platform/primitives"
import {
    BACKUP_FORMAT,
    TABLE_SCHEMA,
    type BackupManifest,
    type BackupRow,
    type ManifestEntry,
    type TableFile,
} from "./backup.contracts"
import { CrmBackupError, CrmBackupErrorCode } from "./errors/crm-backup.error"

/** The parsed JSON of a backup file (`table` names it), or `code` with the parse failure as its cause. */
export const jsonOf = (text: string, code: CrmBackupErrorCode, table: string): unknown => {
    try {
        return JSON.parse(text)
    } catch (cause) {
        throw new CrmBackupError({ code, params: { table }, cause })
    }
}

/** The relative path of a table's file. */
export const tablePathOf = (table: string): string => `tables/${table}.json`

/** Whether a value is a manifest entry. */
const isEntry = (value: unknown): value is ManifestEntry =>
    isRecord(value) &&
    typeof value["path"] === "string" &&
    typeof value["table"] === "string" &&
    typeof value["items"] === "number" &&
    typeof value["sha256"] === "string"

/** A parsed `manifest.json` of format @2, or CRM_BACKUP_MANIFEST_INVALID. */
export const manifestOf = (value: unknown): BackupManifest => {
    if (
        !isRecord(value) ||
        value["format"] !== BACKUP_FORMAT ||
        typeof value["snapshotAt"] !== "string" ||
        typeof value["source"] !== "string" ||
        !Array.isArray(value["files"])
    ) {
        throw new CrmBackupError({ code: CrmBackupErrorCode.ManifestInvalid })
    }
    const files: ReadonlyArray<unknown> = value["files"]
    if (!files.every((entry) => isEntry(entry))) throw new CrmBackupError({ code: CrmBackupErrorCode.ManifestInvalid })
    return { format: BACKUP_FORMAT, snapshotAt: value["snapshotAt"], source: value["source"], files: [...files] }
}

/** A parsed table file of `table`, or null when the value is not one (an old or foreign file). */
export const tableFileOf = (value: unknown, table: string): TableFile | null => {
    if (
        !isRecord(value) ||
        value["schema"] !== TABLE_SCHEMA ||
        value["table"] !== table ||
        typeof value["exportedAt"] !== "string" ||
        typeof value["source"] !== "string" ||
        !Array.isArray(value["items"])
    ) {
        return null
    }
    const items: ReadonlyArray<unknown> = value["items"]
    const rows = items.filter((item): item is BackupRow => isRecord(item))
    if (rows.length !== items.length) return null
    return { schema: TABLE_SCHEMA, exportedAt: value["exportedAt"], source: value["source"], table, items: rows }
}

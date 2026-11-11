/** The format id of the table-shaped backup (next to the entity-shaped `@1` of the data repository). */
export const BACKUP_FORMAT = "nivo-web-lite-data@2"

/** The schema id of every table file of a backup. */
export const TABLE_SCHEMA = "nivo-web-lite-data/table@2"

/** What a backup names as its source. */
export const BACKUP_SOURCE = "nivo-web-crm"

/** One row as the database function answers it: column name (as stored) to its JSON value. */
export type BackupRow = Readonly<Record<string, unknown>>

/** One table file: `tables/<table>.json`. */
export interface TableFile {
    /** TABLE_SCHEMA. */
    readonly schema: string
    /** The export that last CHANGED this file (kept when the rows are unchanged, so an unchanged table gives no diff). */
    readonly exportedAt: string
    /** The source database. */
    readonly source: string
    /** The table, without its schema (`crm_customers`). */
    readonly table: string
    /** Every row with every column (ids, workspace ids, timestamps), ordered by id. */
    readonly items: ReadonlyArray<BackupRow>
}

/** One manifest entry. */
export interface ManifestEntry {
    /** The file, relative to the backup directory. */
    readonly path: string
    /** The table. */
    readonly table: string
    /** Its row count. */
    readonly items: number
    /** sha256 of the file's canonical text. */
    readonly sha256: string
}

/** `manifest.json`: counts and digests, no row. */
export interface BackupManifest {
    /** BACKUP_FORMAT. */
    readonly format: string
    /** The instant of this snapshot. */
    readonly snapshotAt: string
    /** The source database. */
    readonly source: string
    /** One entry per table, in restore order. */
    readonly files: ReadonlyArray<ManifestEntry>
}

/** What an export or a restore did: counts only. */
export interface BackupSummary {
    /** Tables written or restored. */
    readonly tables: number
    /** Rows written or restored. */
    readonly rows: number
}

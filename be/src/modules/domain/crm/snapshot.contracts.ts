/** The interchange format the import reads: the sealed data repository `nivo-web-lite-data`, format @1 (its FORMAT.md). */
export const SNAPSHOT_FORMAT = "nivo-web-lite-data@1"

/**
 * The kind of one field of a format @1 item, as the import checks it; a list is the closed set of values the format's schema
 * allows for the field (its JSON Schema `enum`).
 */
export type SnapshotFieldKind =
    "text" | "text?" | "int" | "bool?" | "date?" | "money?" | "origin" | "object" | ReadonlyArray<string>

/** The declared fields of one entity file of format @1: its schema id and each field's kind. */
export interface SnapshotEntityFormat {
    /** The schema id the file must carry (`nivo-web-lite-data/<entity>@1`). */
    readonly schema: string
    /** Every field an item carries, with its kind; an item with a missing or mistyped field is refused. */
    readonly fields: Readonly<Record<string, SnapshotFieldKind>>
}

/** One item of a format @1 file, after its fields were checked against the entity's format. */
export type SnapshotItem = Readonly<Record<string, unknown>>

/** One manifest entry of a snapshot. */
export interface SnapshotEntry {
    /** The file, relative to the snapshot directory (`data/<entity>.json`). */
    readonly path: string
    /** The entity. */
    readonly entity: string
    /** The file's schema id. */
    readonly schema: string
    /** The item count. */
    readonly items: number
    /** The sha256 of the file's canonical plaintext. */
    readonly sha256: string
}

/** What one import does: the plaintext snapshot directory, the enterprise workspace it binds to, and whether it writes. */
export interface SnapshotImportInput {
    /** The plaintext snapshot directory (after `tools/restore.mjs` or an in-memory decrypt of the data repository). */
    readonly from: string
    /** The enterprise workspace the whole snapshot is bound to (a uuid; the format carries none). */
    readonly workspaceId: string
    /** True writes the rows; absent or false checks the snapshot and counts what would change, writing nothing. */
    readonly execute?: boolean | undefined
}

/** The counts of one entity of an import: never a name, a code or an amount. */
export interface SnapshotEntityCount {
    /** The entity. */
    readonly entity: string
    /** Items in the snapshot. */
    readonly items: number
    /** Items new to the workspace. */
    readonly inserted: number
    /** Items whose content changed (by their source hash). */
    readonly updated: number
    /** Items already stored unchanged. */
    readonly unchanged: number
}

/** What one import did (or, dry, would do). */
export interface SnapshotImportSummary {
    /** Whether rows were written. */
    readonly executed: boolean
    /** The counts per entity, in import order. */
    readonly entities: ReadonlyArray<SnapshotEntityCount>
}

/** What one upload of document originals does: the folder they are under, the workspace whose documents index lists them. */
export interface DocumentUploadInput {
    /** The folder of the originals; each is found by the relative path the documents index records. */
    readonly from: string
    /** The enterprise workspace whose documents are uploaded. */
    readonly workspaceId: string
    /** True uploads; absent or false only checks and counts. */
    readonly execute?: boolean | undefined
}

/** What one upload did (or, dry, would do): counts only, never a name or a path. */
export interface DocumentUploadSummary {
    /** Whether anything was uploaded. */
    readonly executed: boolean
    /** Documents the workspace's index lists. */
    readonly indexed: number
    /** Originals uploaded now (dry: that would be). */
    readonly uploaded: number
    /** Documents already stored. */
    readonly alreadyStored: number
    /** Indexed documents with no file under the folder. */
    readonly missing: number
    /** Files whose size or sha256 is not what the index records: refused, never uploaded. */
    readonly mismatched: number
    /** Indexed documents refused without reading: no recorded sha256, or a path that leaves the folder. */
    readonly refused: number
    /** Files under the folder the index does not list: refused, never uploaded. */
    readonly unindexed: number
}

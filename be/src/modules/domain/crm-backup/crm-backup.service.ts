import { Injectable } from "@nestjs/common"
import type { EntityManager } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager, callDbFunction } from "@modules/platform/database"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { canonicalJson, eachInOrder, isRecord, sha256Hex } from "@modules/platform/primitives"
import { BackupFilesClient } from "./backup-files.client"
import { CrmBackupLogEvent } from "./crm-backup.log-events"
import { jsonOf, manifestOf, tableFileOf, tablePathOf } from "./backup-format.policy"
import {
    BACKUP_FORMAT,
    BACKUP_SOURCE,
    TABLE_SCHEMA,
    type BackupManifest,
    type BackupRow,
    type BackupSummary,
    type ManifestEntry,
    type TableFile,
} from "./backup.contracts"
import { CrmBackupError, CrmBackupErrorCode } from "./errors/crm-backup.error"

/** Rows read per page. */
const PAGE = 500

/** The manifest file name. */
const MANIFEST = "manifest.json"

/** A file content without its export instant: what decides whether the table changed. */
const contentOf = (file: TableFile): string => canonicalJson({ ...file, exportedAt: "" })

/** The number a count function answered (bigint arrives as text). */
const countOf = (rows: ReadonlyArray<unknown>): number => {
    const first = rows[0]
    const value = isRecord(first) ? first["row_count"] : undefined
    return typeof value === "string" || typeof value === "number" ? Number(value) : 0
}

/** The JSON rows of one page answer. */
const rowsOf = (page: ReadonlyArray<unknown>): Array<BackupRow> =>
    page.flatMap((row) => (isRecord(row) && isRecord(row["row_data"]) ? [row["row_data"]] : []))

/** A table file verified against its manifest entry, ready to insert. */
interface VerifiedTable {
    readonly table: string
    readonly items: ReadonlyArray<BackupRow>
}

@Injectable()
/**
 * The table-shaped backup (format @2): every CRM table to one canonical JSON file (every column, ids and timestamps included, rows
 * ordered by id) plus a manifest of counts and sha256 digests, read in one transaction; and the restore of such a directory into
 * an EMPTY database, verified file by file before anything is written and count by count before the one transaction commits.
 * Rows move through the listed database functions `public.crm_backup_*` (R334). Document binaries are not part of it: the
 * documents rows carry their storage key and sha256, and the object storage is backed up by its own means.
 */
export class CrmBackupService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectLogger() private readonly logger: Logger,
        private readonly files: BackupFilesClient,
    ) {}

    /** Writes `tables/<table>.json` for every table and `manifest.json` under `out`; logs and answers the counts. */
    async export(out: string): Promise<BackupSummary> {
        const summary = await this.exported(out)
        this.logger.info(CrmBackupLogEvent.Exported, { ...summary })
        return summary
    }

    /** Restores the backup under `from` into an empty database; logs and answers the counts. */
    async restore(from: string): Promise<BackupSummary> {
        const summary = await this.restored(from)
        this.logger.info(CrmBackupLogEvent.Restored, { ...summary })
        return summary
    }

    /** The export in one transaction. */
    private exported(out: string): Promise<BackupSummary> {
        const now = this.clock.now().toISOString()
        return this.entityManager.transaction(async (tx) => {
            const tables = await this.tablesOf(tx)
            const entries = await eachInOrder(tables, (table) => this.exportTable(tx, out, table, now))
            const manifest: BackupManifest = {
                format: BACKUP_FORMAT,
                snapshotAt: now,
                source: BACKUP_SOURCE,
                files: entries,
            }
            await this.files.write(out, MANIFEST, canonicalJson(manifest))
            return { tables: entries.length, rows: entries.reduce((sum, entry) => sum + entry.items, 0) }
        })
    }

    /** The restore: verify every file, then insert everything in one transaction. */
    private async restored(from: string): Promise<BackupSummary> {
        const text = await this.files.read(from, MANIFEST)
        if (text === null) throw new CrmBackupError({ code: CrmBackupErrorCode.ManifestInvalid })
        const manifest = manifestOf(jsonOf(text, CrmBackupErrorCode.ManifestInvalid, MANIFEST))
        const tables = await this.tablesOf(this.entityManager)
        const extra = manifest.files.find((entry) => !tables.includes(entry.table))
        if (extra !== undefined) {
            throw new CrmBackupError({ code: CrmBackupErrorCode.TableMissing, params: { table: extra.table } })
        }
        const verified = await eachInOrder(tables, (table) => this.verified(from, manifest, table))
        return this.entityManager.transaction(async (tx) => {
            await eachInOrder(verified, ({ table }) => this.assertEmpty(tx, table))
            await eachInOrder(verified, (entry) => this.insert(tx, entry))
            return { tables: verified.length, rows: verified.reduce((sum, entry) => sum + entry.items.length, 0) }
        })
    }

    /** The backup tables in restore order, as the database lists them. */
    private async tablesOf(manager: EntityManager): Promise<ReadonlyArray<string>> {
        const rows = await callDbFunction(manager, "public.crm_backup_tables", [])
        return rows.flatMap((row) =>
            isRecord(row) && typeof row["table_name"] === "string" ? [row["table_name"]] : [],
        )
    }

    /** Refuses a table that already holds rows. */
    private async assertEmpty(tx: EntityManager, table: string): Promise<void> {
        if (countOf(await callDbFunction(tx, "public.crm_backup_count", [table])) > 0) {
            throw new CrmBackupError({ code: CrmBackupErrorCode.DatabaseNotEmpty, params: { table } })
        }
    }

    /** Inserts the rows of one table and proves the table now holds exactly them. */
    private async insert(tx: EntityManager, { table, items }: VerifiedTable): Promise<void> {
        if (items.length > 0) await callDbFunction(tx, "public.crm_backup_insert", [table, JSON.stringify(items)])
        if (countOf(await callDbFunction(tx, "public.crm_backup_count", [table])) !== items.length) {
            throw new CrmBackupError({ code: CrmBackupErrorCode.CountMismatch, params: { table } })
        }
    }

    /** Every row of `table` after the id `after` (null: from the start), page by page. */
    private async rowsAfter(tx: EntityManager, table: string, after: string | null): Promise<Array<BackupRow>> {
        const rows = rowsOf(await callDbFunction(tx, "public.crm_backup_page", [table, after, PAGE]))
        const last = rows.at(-1)?.["id"]
        if (rows.length < PAGE || typeof last !== "string") return rows
        return [...rows, ...(await this.rowsAfter(tx, table, last))]
    }

    /** Reads one table, writes its file (keeping the earlier export instant when nothing changed). */
    private async exportTable(tx: EntityManager, out: string, table: string, now: string): Promise<ManifestEntry> {
        const items = await this.rowsAfter(tx, table, null)
        const path = tablePathOf(table)
        const fresh: TableFile = { schema: TABLE_SCHEMA, exportedAt: now, source: BACKUP_SOURCE, table, items }
        const previousText = await this.files.read(out, path)
        const previous =
            previousText === null
                ? null
                : tableFileOf(jsonOf(previousText, CrmBackupErrorCode.DigestMismatch, table), table)
        const unchanged = previous !== null && contentOf(previous) === contentOf(fresh)
        const text = canonicalJson(unchanged ? { ...fresh, exportedAt: previous.exportedAt } : fresh)
        await this.files.write(out, path, text)
        return { path, table, items: items.length, sha256: sha256Hex(text) }
    }

    /** The rows of the file of `table`, after its digest, its canonical form and its count matched the manifest. */
    private async verified(from: string, manifest: BackupManifest, table: string): Promise<VerifiedTable> {
        const entry = manifest.files.find((candidate) => candidate.table === table)
        const text = entry === undefined ? null : await this.files.read(from, entry.path)
        if (entry === undefined || text === null) {
            throw new CrmBackupError({ code: CrmBackupErrorCode.TableMissing, params: { table } })
        }
        const file =
            sha256Hex(text) === entry.sha256
                ? tableFileOf(jsonOf(text, CrmBackupErrorCode.DigestMismatch, table), table)
                : null
        if (file === null || canonicalJson(file) !== text || file.items.length !== entry.items) {
            throw new CrmBackupError({ code: CrmBackupErrorCode.DigestMismatch, params: { table } })
        }
        return { table, items: file.items }
    }
}

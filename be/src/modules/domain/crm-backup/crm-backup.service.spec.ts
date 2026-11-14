import { Test } from "@nestjs/testing"
import { FakeClock, type MockEntityManager, fakeTransaction, mock, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { LOGGER, type Logger } from "@modules/platform/logging"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { canonicalJson, sha256Hex } from "@modules/platform/primitives"
import { WS, uuid } from "@tests/fixtures/builders/crm.builder"
import { BackupFilesClient } from "./backup-files.client"
import { CrmBackupService } from "./crm-backup.service"
import { CrmBackupErrorCode } from "./errors/crm-backup.error"

const NOW = "2026-11-12T03:00:00.000Z"
const EARLIER = "2026-11-01T03:00:00.000Z"

const TABLES_SQL = 'SELECT * FROM "public"."crm_backup_tables"()'
const PAGE_SQL = 'SELECT * FROM "public"."crm_backup_page"($1, $2, $3)'
const COUNT_SQL = 'SELECT * FROM "public"."crm_backup_count"($1)'
const INSERT_SQL = 'SELECT * FROM "public"."crm_backup_insert"($1, $2)'

const TABLES = [{ table_name: "crm_customers" }, { table_name: "crm_contacts" }]

/** Two synthetic customer rows as the page function answers them (column names as stored, in canonical key order). */
const CUSTOMERS = [
    { code: "SYN-001", created_at: "2026-11-01T03:00:00.123456+00:00", id: uuid(1), workspace_id: WS },
    { code: "SYN-002", created_at: "2026-11-01T03:00:00.123456+00:00", id: uuid(2), workspace_id: WS },
]

/** The canonical table file of `table` with `items`, exported at `exportedAt`. */
const fileText = (table: string, items: ReadonlyArray<object>, exportedAt: string): string =>
    canonicalJson({ schema: "nivo-web-lite-data/table@2", exportedAt, source: "nivo-web-crm", table, items })

/** A backup directory: the two table files and a manifest that names them truly. */
const directory = (): Map<string, string> => {
    const customers = fileText("crm_customers", CUSTOMERS, EARLIER)
    const contacts = fileText("crm_contacts", [], EARLIER)
    const entry = (table: string, text: string, items: number): object => ({
        path: `tables/${table}.json`,
        table,
        items,
        sha256: sha256Hex(text),
    })
    const manifest = canonicalJson({
        format: "nivo-web-lite-data@2",
        snapshotAt: EARLIER,
        source: "nivo-web-crm",
        files: [entry("crm_customers", customers, 2), entry("crm_contacts", contacts, 0)],
    })
    return new Map([
        ["manifest.json", manifest],
        ["tables/crm_customers.json", customers],
        ["tables/crm_contacts.json", contacts],
    ])
}

const build = async (em: MockEntityManager, stored: Map<string, string>) => {
    const transaction = fakeTransaction(em)
    const files = mock<BackupFilesClient>()
    const logger = mock<Logger>()
    files.read.mockImplementation((_root, path) => Promise.resolve(stored.get(path) ?? null))
    files.write.mockResolvedValue()
    const moduleRef = await Test.createTestingModule({
        providers: [
            CrmBackupService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: LOGGER, useValue: logger },
            { provide: BackupFilesClient, useValue: files },
        ],
    }).compile()
    return { backup: moduleRef.get(CrmBackupService), files, logger, transaction }
}

/** The text written to `path`, or undefined. */
const writtenAt = (files: ReturnType<typeof mock<BackupFilesClient>>, path: string): unknown =>
    files.write.mock.calls.find((call) => call[1] === path)?.[2]

describe("CrmBackupService.export: every table in one transaction", () => {
    it("writes each table file with every row and a manifest of counts and digests", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, TABLES],
                [PAGE_SQL, CUSTOMERS.map((row) => ({ row_data: row }))],
                [PAGE_SQL, []],
            ],
        })
        const { backup, files, logger, transaction } = await build(em, new Map())

        await expect(backup.export("out")).resolves.toEqual({ tables: 2, rows: 2 })
        expect(logger.info).toHaveBeenCalledWith("crm_backup.exported", { tables: 2, rows: 2 })

        const customers = fileText("crm_customers", CUSTOMERS, NOW)
        expect(writtenAt(files, "tables/crm_customers.json")).toBe(customers)
        expect(writtenAt(files, "manifest.json")).toBe(
            canonicalJson({
                format: "nivo-web-lite-data@2",
                snapshotAt: NOW,
                source: "nivo-web-crm",
                files: [
                    {
                        path: "tables/crm_customers.json",
                        table: "crm_customers",
                        items: 2,
                        sha256: sha256Hex(customers),
                    },
                    {
                        path: "tables/crm_contacts.json",
                        table: "crm_contacts",
                        items: 0,
                        sha256: sha256Hex(fileText("crm_contacts", [], NOW)),
                    },
                ],
            }),
        )
        expect(em.query).toHaveBeenCalledWith(PAGE_SQL, ["crm_customers", null, 500])
        expect(transaction.commits).toBe(1)
    })
})

describe("CrmBackupService.export: unchanged tables give no diff", () => {
    it("keeps the earlier export instant of a table whose rows did not change", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, TABLES],
                [PAGE_SQL, CUSTOMERS.map((row) => ({ row_data: row }))],
                [PAGE_SQL, [{ row_data: { id: uuid(9) } }]],
            ],
        })
        const { backup, files } = await build(em, directory())

        await backup.export("out")

        expect(writtenAt(files, "tables/crm_customers.json")).toBe(fileText("crm_customers", CUSTOMERS, EARLIER))
        expect(writtenAt(files, "tables/crm_contacts.json")).toBe(fileText("crm_contacts", [{ id: uuid(9) }], NOW))
    })
})

describe("CrmBackupService.export: paging", () => {
    it("reads the next page after the last id of a full page", async () => {
        const full = Array.from({ length: 500 }, (_, index) => ({ row_data: { id: uuid(index + 1) } }))
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, [{ table_name: "crm_customers" }]],
                [PAGE_SQL, full],
                [PAGE_SQL, [{ row_data: { id: uuid(501) } }]],
            ],
        })
        const { backup } = await build(em, new Map())

        await expect(backup.export("out")).resolves.toEqual({ tables: 1, rows: 501 })
        expect(em.query).toHaveBeenLastCalledWith(PAGE_SQL, ["crm_customers", uuid(500), 500])
    })
})

describe("CrmBackupService: answers that are not rows", () => {
    it("lists only the table answers that carry a text table name", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, [null, { table_name: 7 }, { table_name: "crm_customers" }]],
                [PAGE_SQL, []],
            ],
        })
        const { backup } = await build(em, new Map())
        await expect(backup.export("out")).resolves.toEqual({ tables: 1, rows: 0 })
    })

    it("keeps only the page answers whose row_data is a record", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, [{ table_name: "crm_customers" }]],
                [PAGE_SQL, [null, { row_data: "text" }, { row_data: { id: uuid(1) } }]],
            ],
        })
        const { backup, files } = await build(em, new Map())
        await expect(backup.export("out")).resolves.toEqual({ tables: 1, rows: 1 })
        expect(writtenAt(files, "tables/crm_customers.json")).toBe(fileText("crm_customers", [{ id: uuid(1) }], NOW))
    })

    it("refuses the restore of a manifest table the database answer left out when that answer holds non-rows", async () => {
        const em = mockEntityManager({ query: [TABLES_SQL, [null, { table_name: 7 }, TABLES[0]]] })
        const { backup } = await build(em, directory())
        await expect(backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.TableMissing, params: { table: "crm_contacts" } }),
        )
    })
})

describe("CrmBackupService.restore: an empty database", () => {
    it("inserts every verified file in restore order inside one transaction and recounts", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, TABLES],
                [COUNT_SQL, [{ row_count: "0" }]],
                [COUNT_SQL, [{ row_count: "0" }]],
                [INSERT_SQL, [{ inserted: "2" }]],
                [COUNT_SQL, [{ row_count: "2" }]],
                [COUNT_SQL, [{ row_count: "0" }]],
            ],
        })
        const { backup, logger, transaction } = await build(em, directory())

        await expect(backup.restore("from")).resolves.toEqual({ tables: 2, rows: 2 })
        expect(logger.info).toHaveBeenCalledWith("crm_backup.restored", { tables: 2, rows: 2 })
        expect(transaction.committedWrites).toContainEqual({
            method: "query",
            args: [INSERT_SQL, ["crm_customers", JSON.stringify(CUSTOMERS)]],
        })
        expect(transaction.commits).toBe(1)
    })
})

describe("CrmBackupService.restore: refusals before any write", () => {
    it("refuses a directory without a manifest, or a manifest of another format", async () => {
        const { backup } = await build(mockEntityManager(), new Map())
        await expect(backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.ManifestInvalid }),
        )
        const other = await build(mockEntityManager(), new Map([["manifest.json", '{"format":"other@1"}']]))
        await expect(other.backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.ManifestInvalid }),
        )
        const broken = await build(mockEntityManager(), new Map([["manifest.json", "{"]]))
        await expect(broken.backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.ManifestInvalid }),
        )
    })

    it("refuses a manifest that names a table the database does not list, or lacks one it lists", async () => {
        const fewer = await build(mockEntityManager({ query: [TABLES_SQL, [TABLES[0]]] }), directory())
        await expect(fewer.backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.TableMissing, params: { table: "crm_contacts" } }),
        )
        const more = await build(
            mockEntityManager({ query: [TABLES_SQL, [...TABLES, { table_name: "crm_tickets" }]] }),
            directory(),
        )
        await expect(more.backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.TableMissing, params: { table: "crm_tickets" } }),
        )
    })

    it("refuses a table file whose text is not the one the manifest digests", async () => {
        const stored = directory()
        stored.set("tables/crm_customers.json", fileText("crm_customers", CUSTOMERS.slice(1), EARLIER))
        const { backup, transaction } = await build(mockEntityManager({ query: [TABLES_SQL, TABLES] }), stored)
        await expect(backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.DigestMismatch, params: { table: "crm_customers" } }),
        )
        expect(transaction.outcomes).toEqual([])
    })
})

describe("CrmBackupService.restore: refusals inside the transaction", () => {
    it("refuses a database that already holds rows, and rolls back", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, TABLES],
                [COUNT_SQL, [{ row_count: "3" }]],
            ],
        })
        const { backup, transaction } = await build(em, directory())
        await expect(backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.DatabaseNotEmpty, params: { table: "crm_customers" } }),
        )
        expect(transaction.rollbacks).toBe(1)
    })

    it("rolls back when a table holds another count after its insert", async () => {
        const em = mockEntityManager({
            query: [
                [TABLES_SQL, TABLES],
                [COUNT_SQL, [{ row_count: "0" }]],
                [COUNT_SQL, []],
                [INSERT_SQL, [{ inserted: "1" }]],
                [COUNT_SQL, [{ row_count: 1 }]],
            ],
        })
        const { backup, transaction } = await build(em, directory())
        await expect(backup.restore("from")).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.CountMismatch, params: { table: "crm_customers" } }),
        )
        expect(transaction.rollbacks).toBe(1)
    })
})

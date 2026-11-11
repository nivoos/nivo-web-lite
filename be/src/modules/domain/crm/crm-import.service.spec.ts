import { Test } from "@nestjs/testing"
import { FakeClock, type MockEntityManager, fakeTransaction, mock, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { LOGGER, type Logger } from "@modules/platform/logging"
import { canonicalJson, isRecord, sha256Hex } from "@modules/platform/primitives"
import { WS } from "@tests/fixtures/builders/crm.builder"
import { CrmImportService } from "./crm-import.service"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { CustomerEntity, ImportRunEntity, ServiceEntity } from "./persistence/entities"
import { SnapshotFilesClient } from "./snapshot-files.client"

const NOW = "2026-11-12T03:00:00.000Z"
const ORIGIN = { file: "synthetic/books.xlsx", sheet: "S", row: 2 }
const VND = (amount: number) => ({ amount, currency: "VND" })

/** A synthetic snapshot of format @1: one item per entity (two customers, one the placeholder), no real record. */
const ITEMS: Readonly<Record<string, ReadonlyArray<object>>> = {
    customers: [
        {
            code: "SYN-001",
            kind: "company",
            name: "Synthetic Co",
            taxId: null,
            address: null,
            phone: "0900000000",
            email: null,
            folderPath: null,
            origin: ORIGIN,
        },
        {
            code: "UNASSIGNED",
            kind: "placeholder",
            name: "Unassigned",
            taxId: null,
            address: null,
            phone: null,
            email: null,
            folderPath: null,
            origin: ORIGIN,
        },
    ],
    websites: [{ customerCode: "SYN-001", domain: "synthetic.example", origin: ORIGIN }],
    providers: [{ key: "inet", mode: "dry_run", plugin: "inet" }],
    services: [
        {
            code: "SYN-HOST",
            customerCode: "SYN-001",
            domain: "synthetic.example",
            class: "hosting",
            provider: "inet",
            status: "active",
            statusText: null,
            startsOn: null,
            expiresOn: "2026-12-01",
            expiryBasis: null,
            expirySource: "provider",
            note: null,
            origin: ORIGIN,
        },
    ],
    projects: [
        {
            code: "P-1",
            customerCode: "SYN-001",
            domain: null,
            name: "Synthetic site",
            contractNo: null,
            contractState: null,
            value: VND(10),
            collected: null,
            remaining: VND(10),
            startsOn: null,
            endsOn: null,
            statusText: null,
            note: null,
            origin: ORIGIN,
        },
    ],
    contracts: [
        {
            contractNo: "HD-1",
            kind: "sale",
            customerCode: null,
            partnerName: null,
            content: null,
            value: null,
            signedOn: null,
            effectiveOn: null,
            expiresOn: null,
            autoRenew: true,
            warrantyUntil: null,
            ownerName: null,
            statusText: null,
            storageRef: null,
            origin: ORIGIN,
        },
    ],
    documents: [
        {
            path: "SYN-001/hd.pdf",
            customerCode: "SYN-001",
            kind: "contract",
            invoiceNo: null,
            contractNo: "HD-1",
            fileName: "hd.pdf",
            sizeBytes: 3,
            sha256: "a".repeat(64),
        },
    ],
    invoices: [
        {
            invoiceNo: "00000001",
            customerCode: "NOT-THERE",
            issuedOn: null,
            amount: VND(5),
            documentPath: null,
            origin: ORIGIN,
        },
    ],
    receivables: [
        {
            projectCode: "P-1",
            contractRef: null,
            total: VND(10),
            collected: null,
            remaining: VND(10),
            invoicedNote: null,
            projectState: null,
            salesOwner: null,
            origin: ORIGIN,
        },
    ],
    balances: [
        {
            account: "131",
            partyCode: "KH-1",
            partyName: null,
            openingDebit: null,
            openingCredit: null,
            debit: VND(1),
            credit: null,
            closingDebit: VND(1),
            closingCredit: null,
            note: null,
            origin: ORIGIN,
        },
    ],
    contacts: [],
    issues: [
        { entity: "invoices", field: "", reason: "total_row", severity: "rejected", raw: { A: "x" }, origin: ORIGIN },
    ],
}

/** The snapshot directory of ITEMS (plus `changes` to some files' items), with a manifest that digests it truly. */
const snapshotOf = (changes: Readonly<Record<string, ReadonlyArray<object>>> = {}): Map<string, string> => {
    const files = new Map<string, string>()
    const entries = Object.entries({ ...ITEMS, ...changes }).map(([entity, items]) => {
        const schema = `nivo-web-lite-data/${entity}@1`
        const text = canonicalJson({ schema, exportedAt: NOW, source: "synthetic", items })
        files.set(`data/${entity}.json`, text)
        return { path: `data/${entity}.json`, entity, schema, items: items.length, sha256: sha256Hex(text) }
    })
    files.set(
        "manifest.json",
        canonicalJson({ format: "nivo-web-lite-data@1", snapshotAt: NOW, source: "synthetic", files: entries }),
    )
    return files
}

/** A stored row of the in-memory tables. */
type Row = Record<string, unknown>

/** In-memory tables behind the kit EntityManager double: find by workspace, insert, upsert by its conflict columns, update. */
const tablesBehind = (em: MockEntityManager): Map<unknown, Array<Row>> => {
    const tables = new Map<unknown, Array<Row>>()
    const tableOf = (target: unknown): Array<Row> => tables.get(target) ?? tables.set(target, []).get(target) ?? []
    let next = 0
    const added = (target: unknown, row: unknown): Row => {
        const stored: Row = {
            ...(isRecord(row) ? row : {}),
            id: `00000000-0000-4000-8000-${String((next += 1)).padStart(12, "0")}`,
        }
        tableOf(target).push(stored)
        return stored
    }
    em.find.mockImplementation((target: unknown) => Promise.resolve(tableOf(target)))
    em.insert.mockImplementation((target: unknown, value: unknown) => {
        const list: ReadonlyArray<unknown> = Array.isArray(value) ? value : [value]
        const identifiers = list.map((row) => ({ id: added(target, row)["id"] }))
        return Promise.resolve({ identifiers, generatedMaps: [], raw: [] })
    })
    em.upsert.mockImplementation((target: unknown, value: unknown, conflict: unknown) => {
        const columns: ReadonlyArray<unknown> = Array.isArray(conflict) ? conflict : []
        const list: ReadonlyArray<unknown> = Array.isArray(value) ? value : []
        for (const row of list) {
            const fields = isRecord(row) ? row : {}
            const index = tableOf(target).findIndex((stored) =>
                columns.every((column) => stored[String(column)] === fields[String(column)]),
            )
            if (index < 0) added(target, fields)
            else tableOf(target)[index] = { ...tableOf(target)[index], ...fields }
        }
        return Promise.resolve({ identifiers: [], generatedMaps: [], raw: [] })
    })
    em.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] })
    return tables
}

const build = async (em: MockEntityManager, stored: Map<string, string>) => {
    const transaction = fakeTransaction(em)
    const files = mock<SnapshotFilesClient>()
    files.read.mockImplementation(async (_root, path, entity) => {
        await Promise.resolve()
        const text = stored.get(path)
        if (text === undefined) throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity } })
        return text
    })
    const logger = mock<Logger>()
    const moduleRef = await Test.createTestingModule({
        providers: [
            CrmImportService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: LOGGER, useValue: logger },
            { provide: SnapshotFilesClient, useValue: files },
        ],
    }).compile()
    return { importer: moduleRef.get(CrmImportService), logger, transaction }
}

const counts = (inserted: number, updated: number, unchanged: number) => ({ inserted, updated, unchanged })

describe("CrmImportService: dry by default", () => {
    it("checks the whole snapshot and counts what an import would insert, writing nothing", async () => {
        const em = mockEntityManager()
        tablesBehind(em)
        const { importer, logger, transaction } = await build(em, snapshotOf())

        const summary = await importer.import({ from: "snap", workspaceId: WS, execute: false })

        expect([summary.executed, summary.entities.map((count) => count.entity)]).toEqual([
            false,
            [
                "customers",
                "websites",
                "providers",
                "services",
                "projects",
                "contracts",
                "documents",
                "invoices",
                "receivables",
                "balances",
                "contacts",
                "issues",
            ],
        ])
        expect(summary.entities[0]).toEqual({ entity: "customers", items: 2, ...counts(2, 0, 0) })
        expect([em.insert.mock.calls.length, em.upsert.mock.calls.length, transaction.outcomes]).toEqual([0, 0, []])
        expect(logger.info.mock.calls[0]?.[0]).toBe("crm.import.checked")
    })
})

describe("CrmImportService: execute", () => {
    it("binds every row to the workspace, resolves references by natural key and records the run", async () => {
        const em = mockEntityManager()
        const tables = tablesBehind(em)
        const { importer } = await build(em, snapshotOf())

        const summary = await importer.import({ from: "snap", workspaceId: WS.toUpperCase(), execute: true })

        const customer = tables.get(CustomerEntity)?.find((row) => row["code"] === "SYN-001")
        const service = tables.get(ServiceEntity)?.[0]
        expect([summary.executed, customer?.["workspaceId"], customer?.["reachable"], service?.["customerId"]]).toEqual(
            [true, WS, true, customer?.["id"]],
        )
        expect([...tables.values()].flat().every((row) => row["workspaceId"] === WS)).toBe(true)
        expect(tables.get(ImportRunEntity)).toHaveLength(1)
        expect(em.update.mock.calls[0]?.[2]).toEqual({
            finishedAt: new Date(NOW),
            counts: { entities: summary.entities },
        })
    })

    it("writes nothing again for an unchanged snapshot and only the changed item for a changed one; never deletes", async () => {
        const em = mockEntityManager()
        const tables = tablesBehind(em)
        const first = await build(em, snapshotOf())
        await first.importer.import({ from: "snap", workspaceId: WS, execute: true })
        const writes = em.upsert.mock.calls.length + em.insert.mock.calls.length

        const again = await first.importer.import({ from: "snap", workspaceId: WS, execute: true })
        const renamed = [{ ...ITEMS["customers"]?.[0], name: "Synthetic Co Renamed" }]
        const changed = await (
            await build(em, snapshotOf({ customers: renamed }))
        ).importer.import({ from: "snap", workspaceId: WS, execute: true })

        expect(again.entities[0]).toEqual({ entity: "customers", items: 2, ...counts(0, 0, 2) })
        expect(em.upsert.mock.calls.length + em.insert.mock.calls.length).toBe(writes + 2 + 1)
        expect(changed.entities[0]).toEqual({ entity: "customers", items: 1, ...counts(0, 1, 0) })
        expect(tables.get(CustomerEntity)).toHaveLength(2)
    })
})

describe("CrmImportService: refusals before any write", () => {
    it("refuses a workspace that is no uuid and a manifest of another format", async () => {
        const { importer } = await build(mockEntityManager(), snapshotOf())
        await expect(importer.import({ from: "snap", workspaceId: "acme", execute: true })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ImportWorkspaceInvalid }),
        )
        const other = snapshotOf()
        other.set("manifest.json", canonicalJson({ format: "nivo-web-lite-data@2", files: [] }))
        await expect(
            (await build(mockEntityManager(), other)).importer.import({
                from: "snap",
                workspaceId: WS,
                execute: false,
            }),
        ).rejects.toEqual(expect.objectContaining({ code: CrmErrorCode.ImportManifestInvalid }))
    })

    it("refuses a file whose text is not the one its manifest digests, and an item with a mistyped field", async () => {
        const tampered = snapshotOf()
        tampered.set("data/websites.json", `${tampered.get("data/websites.json") ?? ""} `)
        await expect(
            (await build(mockEntityManager(), tampered)).importer.import({
                from: "snap",
                workspaceId: WS,
                execute: false,
            }),
        ).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ImportFileInvalid, params: { entity: "websites" } }),
        )
        const mistyped = snapshotOf({ services: [{ ...ITEMS["services"]?.[0], class: "mailbox" }] })
        await expect(
            (await build(mockEntityManager(), mistyped)).importer.import({
                from: "snap",
                workspaceId: WS,
                execute: false,
            }),
        ).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ImportItemInvalid, params: { entity: "services", index: 0 } }),
        )
    })

    it("refuses, and rolls back, an item that names a customer the snapshot does not hold where the reference is required", async () => {
        const em = mockEntityManager()
        tablesBehind(em)
        const orphan = snapshotOf({
            websites: [{ customerCode: "NOT-THERE", domain: "orphan.example", origin: ORIGIN }],
        })
        const { importer, transaction } = await build(em, orphan)
        await expect(importer.import({ from: "snap", workspaceId: WS, execute: true })).rejects.toEqual(
            expect.objectContaining({
                code: CrmErrorCode.ImportReferenceUnknown,
                params: { entity: "websites", field: "customerCode" },
            }),
        )
        expect(transaction.rollbacks).toBe(1)
    })
})

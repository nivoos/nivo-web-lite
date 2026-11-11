import { Test } from "@nestjs/testing"
import { FakeClock, type MockEntityManager, mock, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { LOGGER, type Logger } from "@modules/platform/logging"
import { canonicalJson, isRecord, sha256Hex } from "@modules/platform/primitives"
import { WS } from "@tests/fixtures/builders/crm.builder"
import { CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    ImportIssueEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    ProjectEntity,
    ProviderAccountEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import { snapshotJsonOf } from "./snapshot-format.policy"
import { SnapshotExportService } from "./snapshot-export.service"
import { SnapshotFilesClient } from "./snapshot-files.client"
import * as rows from "./snapshot-rows.mapper"
import type { SnapshotItem } from "./snapshot.contracts"

const NOW = "2026-11-12T03:00:00.000Z"
const ORIGIN = { file: "synthetic/books.xlsx", sheet: "S", row: 2 }
const VND = (amount: number) => ({ amount, currency: "VND" })

/**
 * A synthetic snapshot of format @1, every entity in natural-key order, with the cases an export must keep exactly: money the
 * source has not (null), an invoice whose customer code matches no customer, a provider whose plugin is not its key, a contact
 * with a role and a source place. No real record.
 */
const ITEMS: Readonly<Record<string, ReadonlyArray<SnapshotItem>>> = {
    customers: [
        {
            code: "SYN-001",
            kind: "company",
            name: "Synthetic Co",
            taxId: "0100000000",
            address: null,
            phone: "0900000000",
            email: null,
            folderPath: "SYN-001",
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
    providers: [
        { key: "azwebsite", mode: "dry_run", plugin: "manual" },
        { key: "inet", mode: "dry_run", plugin: "inet" },
    ],
    services: [
        {
            code: "SYN-DOM",
            customerCode: "UNASSIGNED",
            domain: null,
            class: "domain",
            provider: "",
            status: "expiry_unknown",
            statusText: null,
            startsOn: null,
            expiresOn: null,
            expiryBasis: null,
            expirySource: "none",
            note: null,
            origin: ORIGIN,
        },
        {
            code: "SYN-HOST",
            customerCode: "SYN-001",
            domain: "synthetic.example",
            class: "hosting",
            provider: "inet",
            status: "active",
            statusText: "ok",
            startsOn: "2025-12-01",
            expiresOn: "2026-12-01",
            expiryBasis: "invoice",
            expirySource: "provider",
            note: null,
            origin: ORIGIN,
        },
    ],
    projects: [
        {
            code: "P-1",
            customerCode: "SYN-001",
            domain: "synthetic.example",
            name: "Synthetic site",
            contractNo: "HD-1",
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
            customerCode: "SYN-001",
            partnerName: null,
            content: null,
            value: VND(10),
            signedOn: "2026-01-02",
            effectiveOn: null,
            expiresOn: null,
            autoRenew: false,
            warrantyUntil: null,
            ownerName: null,
            statusText: null,
            storageRef: null,
            origin: ORIGIN,
        },
        {
            contractNo: "HD-2",
            kind: "purchase",
            customerCode: null,
            partnerName: "Synthetic Vendor",
            content: null,
            value: null,
            signedOn: null,
            effectiveOn: null,
            expiresOn: null,
            autoRenew: null,
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
            issuedOn: "2026-02-03",
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
    contacts: [
        {
            customerCode: "SYN-001",
            name: "Synthetic Person",
            phone: null,
            email: "p@synthetic.example",
            role: "director",
            origin: ORIGIN,
        },
    ],
    issues: [
        { entity: "invoices", field: "", reason: "total_row", severity: "rejected", raw: { A: "x" }, origin: ORIGIN },
    ],
}

/** The tables the import mapper makes of ITEMS for workspace WS (each row given an id), keyed by entity class. */
const tablesOf = (): Map<unknown, Array<Record<string, unknown>>> => {
    let next = 0
    const withId = (row: object): Record<string, unknown> => ({ ...row, id: `id-${String((next += 1))}` })
    const stamp = { workspaceId: WS, runId: "run-1", hash: "h" }
    const of = (entity: string): ReadonlyArray<SnapshotItem> => ITEMS[entity] ?? []
    const customers = of("customers").map((item) => withId(rows.customerRowOf(item, stamp)))
    const refs0 = {
        customers: new Map(customers.map((row) => [String(row["code"]), String(row["id"])])),
        websites: new Map<string, string>(),
        projects: new Map(),
    }
    const websites = of("websites").map((item) => withId(rows.websiteRowOf(item, stamp, refs0)))
    const refs1 = { ...refs0, websites: new Map(websites.map((row) => [String(row["domain"]), String(row["id"])])) }
    const projects = of("projects").map((item) => withId(rows.projectRowOf(item, stamp, refs1)))
    const refs = {
        ...refs1,
        projects: new Map(
            projects.map((row) => [
                String(row["code"]),
                { id: String(row["id"]), customerId: String(row["customerId"]) },
            ]),
        ),
    }
    return new Map<unknown, Array<Record<string, unknown>>>([
        [CustomerEntity, customers],
        [WebsiteEntity, websites],
        [ProjectEntity, projects],
        [ProviderAccountEntity, of("providers").map((item) => withId(rows.providerRowOf(item, WS)))],
        [ServiceEntity, of("services").map((item) => withId(rows.serviceRowOf(item, stamp, refs)))],
        [ContractEntity, of("contracts").map((item) => withId(rows.contractRowOf(item, stamp, refs)))],
        [DocumentEntity, of("documents").map((item) => withId(rows.documentRowOf(item, stamp, refs)))],
        [InvoiceEntity, of("invoices").map((item) => withId(rows.invoiceRowOf(item, stamp, refs)))],
        [ReceivableEntity, of("receivables").map((item) => withId(rows.receivableRowOf(item, stamp, refs)))],
        [LedgerBalanceEntity, of("balances").map((item) => withId(rows.balanceRowOf(item, stamp)))],
        [ContactEntity, of("contacts").map((item) => withId(rows.contactRowOf(item, WS, refs)))],
        [ImportIssueEntity, of("issues").map((item) => withId(rows.issueRowOf(item, stamp)))],
    ])
}

const build = async (em: MockEntityManager, previous: Map<string, string>) => {
    const tables = tablesOf()
    em.find.mockImplementation((target: unknown) => Promise.resolve(tables.get(target) ?? []))
    const files = mock<SnapshotFilesClient>()
    const written = new Map<string, string>()
    files.write.mockImplementation((_root, path, text) => Promise.resolve(void written.set(path, text)))
    files.bytesOf.mockImplementation((_root, path) => {
        const text = previous.get(path)
        return Promise.resolve(text === undefined ? null : new TextEncoder().encode(text))
    })
    const moduleRef = await Test.createTestingModule({
        providers: [
            SnapshotExportService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: LOGGER, useValue: mock<Logger>() },
            { provide: SnapshotFilesClient, useValue: files },
        ],
    }).compile()
    return { exporter: moduleRef.get(SnapshotExportService), written }
}

/** The items field of a written file. */
const itemsOf = (text: string | undefined): unknown => {
    const file = snapshotJsonOf(text ?? "", CrmErrorCode.ImportFileInvalid, "test")
    return isRecord(file) ? file["items"] : undefined
}

describe("SnapshotExportService: round trip", () => {
    it("emits exactly the items the import took, in natural-key order, with natural keys only", async () => {
        const { exporter, written } = await build(mockEntityManager(), new Map())

        await exporter.export({ out: "repo", workspaceId: WS })

        const mismatched = Object.entries(ITEMS).filter(
            ([entity, items]) => canonicalJson(itemsOf(written.get(`data/${entity}.json`))) !== canonicalJson(items),
        )
        expect(mismatched.map(([entity]) => entity)).toEqual([])
        expect([...written.values()].some((text) => text.includes(WS) || text.includes("id-1"))).toBe(false)
    })

    it("writes a manifest of format @1 that digests every file it wrote", async () => {
        const { exporter, written } = await build(mockEntityManager(), new Map())

        const summary = await exporter.export({ out: "repo", workspaceId: WS })

        const manifest = snapshotJsonOf(written.get("manifest.json") ?? "", CrmErrorCode.ImportFileInvalid, "manifest")
        const files: unknown = isRecord(manifest) ? manifest["files"] : []
        const entries: ReadonlyArray<unknown> = Array.isArray(files) ? files : []
        expect(isRecord(manifest) ? [manifest["format"], manifest["source"], manifest["snapshotAt"]] : []).toEqual([
            "nivo-web-lite-data@1",
            "nivo-web-crm",
            NOW,
        ])
        expect(
            entries.every(
                (entry) => isRecord(entry) && entry["sha256"] === sha256Hex(written.get(String(entry["path"])) ?? ""),
            ),
        ).toBe(true)
        expect(summary.entities.map((count) => count.items)).toEqual([2, 1, 2, 2, 1, 2, 1, 1, 1, 1, 1, 1])
    })
})

describe("SnapshotExportService: no diff without a change", () => {
    it("keeps the earlier export instant of a file whose items did not change, and dates a changed one now", async () => {
        const first = await build(mockEntityManager(), new Map())
        await first.exporter.export({ out: "repo", workspaceId: WS })
        const previous = new Map(
            [...first.written.entries()].map(([path, text]) => [
                path,
                text.replaceAll(NOW, "2026-11-01T00:00:00.000Z"),
            ]),
        )
        previous.set(
            "data/websites.json",
            canonicalJson({
                schema: "nivo-web-lite-data/websites@1",
                exportedAt: "2026-11-01T00:00:00.000Z",
                source: "nivo-web-crm",
                items: [],
            }),
        )

        const again = await build(mockEntityManager(), previous)
        await again.exporter.export({ out: "repo", workspaceId: WS })

        const exportedAt = (path: string): unknown => {
            const file = snapshotJsonOf(again.written.get(path) ?? "", CrmErrorCode.ImportFileInvalid, path)
            return isRecord(file) ? file["exportedAt"] : undefined
        }
        expect([exportedAt("data/customers.json"), exportedAt("data/websites.json")]).toEqual([
            "2026-11-01T00:00:00.000Z",
            NOW,
        ])
    })
})

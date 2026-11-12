import { createHash } from "node:crypto"
import { Injectable } from "@nestjs/common"
import type { EntityManager, EntityTarget, ObjectLiteral } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { canonicalJson, eachInOrder, isRecord, sha256Hex } from "@modules/platform/primitives"
import {
    InjectObjectStorage,
    InjectObjectStorageBucket,
    type ObjectStorage,
} from "@modules/integrations/object-storage"
import { CrmImportLogEvent } from "./crm-import.log-events"
import { documentKeyOf, insideFolderOf } from "./document-storage.policy"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    ImportIssueEntity,
    ImportRunEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    ProjectEntity,
    ProviderAccountEntity,
    PurchaseEntity,
    PurchaseFollowupEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import { SNAPSHOT_ENTITIES, snapshotEntriesOf, snapshotItemsOf, snapshotJsonOf } from "./snapshot-format.policy"
import { SnapshotExportService } from "./snapshot-export.service"
import { SnapshotFilesClient } from "./snapshot-files.client"
import * as rows from "./snapshot-rows.mapper"
import type {
    DocumentUploadInput,
    DocumentUploadSummary,
    SnapshotEntityCount,
    SnapshotExportInput,
    SnapshotExportSummary,
    SnapshotImportInput,
    SnapshotImportSummary,
    SnapshotItem,
} from "./snapshot.contracts"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

/** Rows written per statement. */
const CHUNK = 200

/** The most rows of one table a workspace is read with (a CRM workspace holds hundreds); more is refused, never cut silently. */
const STORED_ROWS_MAX = 50_000

/** The content type every original is stored with; the download link names the file. */
const ORIGINAL_CONTENT_TYPE = "application/octet-stream"

/** What happened to one indexed document in an upload. */
type UploadOutcome = "uploaded" | "alreadyStored" | "missing" | "mismatched" | "refused"

/** The hex sha256 of a file's bytes. */
const sha256OfBytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex")

/** How one entity of format @1 lands in its table. */
interface EntityPlan {
    /** The table's entity. */
    readonly target: EntityTarget<ObjectLiteral>
    /** The natural key of an item (fields joined by U+001F, as the format sorts them). */
    readonly itemKey: (item: SnapshotItem) => string
    /** The same natural key of a stored row. */
    readonly rowKey: (row: ObjectLiteral, refs: rows.SnapshotRefs) => string
    /** The conflict columns of the upsert; null: rows are only inserted when absent (no source hash to compare). */
    readonly conflict: ReadonlyArray<string> | null
    /** The row of one item. */
    readonly rowOf: (item: SnapshotItem, stamp: rows.SnapshotStamp, refs: rows.SnapshotRefs) => ObjectLiteral
}

/** The natural key of a value by its fields, joined by U+001F. */
const keyOf = (value: Readonly<Record<string, unknown>>, fields: ReadonlyArray<string>): string =>
    fields.map((field) => String(value[field])).join("\u001f")

/** The key functions of a natural key whose item fields and row columns are named alike. */
const sameKeys = (...fields: Array<string>): Pick<EntityPlan, "itemKey" | "rowKey"> => ({
    itemKey: (item) => keyOf(item, fields),
    rowKey: (row) => keyOf(row, fields),
})

/** The provenance key of an import issue: its source place, field and reason. */
const issueKeys: Pick<EntityPlan, "itemKey" | "rowKey"> = {
    itemKey: (item) => {
        const origin = item["origin"]
        const place = isRecord(origin) ? origin : {}
        return keyOf({ ...place, field: item["field"], reason: item["reason"] }, [
            "file",
            "sheet",
            "row",
            "field",
            "reason",
        ])
    },
    rowKey: (row) => keyOf(row, ["sourceFile", "sourceSheet", "sourceRow", "field", "reason"]),
}

/** The plan of every entity of format @1, by entity name. */
const PLANS: ReadonlyMap<string, EntityPlan> = new Map<string, EntityPlan>([
    [
        "customers",
        { target: CustomerEntity, ...sameKeys("code"), conflict: ["workspaceId", "code"], rowOf: rows.customerRowOf },
    ],
    [
        "websites",
        { target: WebsiteEntity, ...sameKeys("domain"), conflict: ["workspaceId", "domain"], rowOf: rows.websiteRowOf },
    ],
    [
        "providers",
        {
            target: ProviderAccountEntity,
            itemKey: (item) => String(item["key"]),
            rowKey: (row) => String(row["provider"]),
            conflict: null,
            rowOf: (item, stamp) => rows.providerRowOf(item, stamp.workspaceId),
        },
    ],
    [
        "services",
        { target: ServiceEntity, ...sameKeys("code"), conflict: ["workspaceId", "code"], rowOf: rows.serviceRowOf },
    ],
    [
        "projects",
        { target: ProjectEntity, ...sameKeys("code"), conflict: ["workspaceId", "code"], rowOf: rows.projectRowOf },
    ],
    [
        "contracts",
        {
            target: ContractEntity,
            ...sameKeys("contractNo"),
            conflict: ["workspaceId", "contractNo"],
            rowOf: rows.contractRowOf,
        },
    ],
    [
        "documents",
        { target: DocumentEntity, ...sameKeys("path"), conflict: ["workspaceId", "path"], rowOf: rows.documentRowOf },
    ],
    [
        "invoices",
        {
            target: InvoiceEntity,
            ...sameKeys("invoiceNo"),
            conflict: ["workspaceId", "invoiceNo"],
            rowOf: rows.invoiceRowOf,
        },
    ],
    [
        "receivables",
        {
            target: ReceivableEntity,
            ...sameKeys("projectCode"),
            conflict: ["workspaceId", "projectCode"],
            rowOf: rows.receivableRowOf,
        },
    ],
    [
        "balances",
        {
            target: LedgerBalanceEntity,
            ...sameKeys("account", "partyCode"),
            conflict: ["workspaceId", "account", "partyCode"],
            rowOf: rows.balanceRowOf,
        },
    ],
    [
        "contacts",
        {
            target: ContactEntity,
            ...sameKeys("name", "phone", "email"),
            conflict: null,
            rowOf: (item, stamp, refs) => rows.contactRowOf(item, stamp.workspaceId, refs),
        },
    ],
    [
        "purchases",
        {
            target: PurchaseEntity,
            ...sameKeys("code"),
            conflict: ["workspaceId", "code"],
            rowOf: (item, stamp, refs) => rows.purchaseRowOf(item, stamp, refs),
        },
    ],
    [
        "purchase-followups",
        {
            target: PurchaseFollowupEntity,
            itemKey: (item) => keyOf(item, ["purchaseCode", "day"]),
            rowKey: (row, refs) => {
                const purchaseId = String(row["purchaseId"])
                const code = String([...refs.purchases].find(([, id]) => id === purchaseId)?.[0])
                return keyOf({ purchaseCode: code, day: row["day"] }, ["purchaseCode", "day"])
            },
            conflict: ["workspaceId", "purchaseId", "day"],
            rowOf: (item, stamp, refs) => rows.followUpRowOf(item, stamp, refs),
        },
    ],
    ["issues", { target: ImportIssueEntity, ...issueKeys, conflict: null, rowOf: rows.issueRowOf }],
])

/** One entity of a checked snapshot. */
interface SnapshotPart {
    readonly entity: string
    readonly plan: EntityPlan
    readonly items: ReadonlyArray<SnapshotItem>
}

/** A checked snapshot: its source label and its parts in import order. */
interface Snapshot {
    readonly source: string
    readonly parts: ReadonlyArray<SnapshotPart>
}

/** The plan of an entity the format lists (every listed entity has one). */
const planOf = (entity: string): EntityPlan => {
    const plan = PLANS.get(entity)
    if (plan === undefined) throw new CrmError({ code: CrmErrorCode.ImportManifestInvalid })
    return plan
}

@Injectable()
/**
 * The first load and every later refresh of a workspace's CRM from the sealed data repository `nivo-web-lite-data`, format @1:
 * structured JSON to rows, nothing else (no source file is parsed, no word decides a meaning). The snapshot is checked whole
 * before anything is written (manifest, each file's sha256, schema id, count, every field's kind), then bound to the workspace
 * given and upserted by natural key in one transaction: an item whose content hash is unchanged is not written, and an item
 * absent from the snapshot is never deleted. Dry (the default) counts what would change. Logs carry counts only.
 */
export class CrmImportService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectLogger() private readonly logger: Logger,
        private readonly files: SnapshotFilesClient,
        @InjectObjectStorage() private readonly storage: ObjectStorage,
        @InjectObjectStorageBucket() private readonly bucket: string,
        private readonly exporter: SnapshotExportService,
    ) {}

    /** Writes the workspace's snapshot in format @1 under `out` (the CRM's backup of record); answers the counts. */
    exportSnapshot(input: SnapshotExportInput): Promise<SnapshotExportSummary> {
        const workspaceId = input.workspaceId.toLowerCase()
        if (!UUID.test(workspaceId)) {
            return Promise.reject(new CrmError({ code: CrmErrorCode.ImportWorkspaceInvalid }))
        }
        return this.exporter.export({ out: input.out, workspaceId })
    }

    /** Checks the snapshot under `from` and imports it into `workspaceId`, or, dry, counts what an import would change. */
    async import(input: SnapshotImportInput): Promise<SnapshotImportSummary> {
        const workspaceId = input.workspaceId.toLowerCase()
        if (!UUID.test(workspaceId)) throw new CrmError({ code: CrmErrorCode.ImportWorkspaceInvalid })
        const snapshot = await this.snapshotOf(input.from)
        const summary =
            input.execute === true
                ? await this.entityManager.transaction((tx) => this.written(tx, workspaceId, snapshot))
                : {
                      executed: false,
                      entities: await eachInOrder(snapshot.parts, (part) =>
                          this.counted(this.entityManager, workspaceId, part),
                      ),
                  }
        this.logger.info(input.execute === true ? CrmImportLogEvent.Imported : CrmImportLogEvent.Checked, {
            entities: summary.entities.map((count) => ({ ...count })),
        })
        return summary
    }

    /**
     * Uploads the originals of the workspace's indexed documents from `from` to the private storage, content-addressed at
     * `<workspaceId>/documents/<sha256>`: each file is found by its recorded relative path and its size and sha256 are verified
     * BEFORE upload; a file the index does not list, a mismatched file and a path leaving the folder are refused. Dry unless
     * `execute`. Logs and answers counts only.
     */
    async uploadDocuments(input: DocumentUploadInput): Promise<DocumentUploadSummary> {
        const workspaceId = input.workspaceId.toLowerCase()
        if (!UUID.test(workspaceId)) throw new CrmError({ code: CrmErrorCode.ImportWorkspaceInvalid })
        const documents = await this.entityManager.find(DocumentEntity, {
            where: { workspaceId },
            take: STORED_ROWS_MAX,
        })
        const indexed = new Set(documents.flatMap((document) => insideFolderOf(document.path) ?? []))
        const unindexed = (await this.files.filesUnder(input.from)).filter((file) => !indexed.has(file)).length
        const outcomes = await eachInOrder(documents, (document) =>
            this.uploaded(input.from, workspaceId, document, input.execute === true),
        )
        const count = (outcome: UploadOutcome): number => outcomes.filter((candidate) => candidate === outcome).length
        const summary: DocumentUploadSummary = {
            executed: input.execute === true,
            indexed: documents.length,
            uploaded: count("uploaded"),
            alreadyStored: count("alreadyStored"),
            missing: count("missing"),
            mismatched: count("mismatched"),
            refused: count("refused"),
            unindexed,
        }
        this.logger.info(CrmImportLogEvent.DocumentsUploaded, { ...summary })
        return summary
    }

    /** What happens to one indexed document: verified against its file, then (when executing) stored and recorded. */
    private async uploaded(
        from: string,
        workspaceId: string,
        document: DocumentEntity,
        execute: boolean,
    ): Promise<UploadOutcome> {
        const path = insideFolderOf(document.path)
        if (document.sha256 === null || path === null) return "refused"
        if (document.storageKey !== null) return "alreadyStored"
        const bytes = await this.files.bytesOf(from, path)
        if (bytes === null) return "missing"
        if (bytes.byteLength !== document.sizeBytes || sha256OfBytes(bytes) !== document.sha256) return "mismatched"
        if (!execute) return "uploaded"
        const key = documentKeyOf(workspaceId, document.sha256)
        if ((await this.storage.head(this.bucket, key)) === null) {
            await this.storage.put(this.bucket, key, bytes, ORIGINAL_CONTENT_TYPE)
        }
        await this.entityManager.update(
            DocumentEntity,
            { id: document.id, workspaceId },
            { storageKey: key, storedAt: this.clock.now() },
        )
        return "uploaded"
    }

    /** The checked snapshot: every listed file read, digested, parsed and its items checked, in the format's import order. */
    private async snapshotOf(from: string): Promise<Snapshot> {
        const manifestText = await this.files.read(from, "manifest.json", "manifest")
        const manifest = snapshotJsonOf(manifestText, CrmErrorCode.ImportManifestInvalid, "manifest")
        const entries = snapshotEntriesOf(manifest)
        const ordered = [...SNAPSHOT_ENTITIES.keys()].flatMap((entity) =>
            entries.filter((entry) => entry.entity === entity),
        )
        const parts = await eachInOrder(ordered, async (entry) => {
            const text = await this.files.read(from, entry.path, entry.entity)
            if (sha256Hex(text) !== entry.sha256) {
                throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity: entry.entity } })
            }
            const file = snapshotJsonOf(text, CrmErrorCode.ImportFileInvalid, entry.entity)
            return {
                entity: entry.entity,
                plan: planOf(entry.entity),
                items: snapshotItemsOf(entry.entity, file, entry),
            }
        })
        const source = isRecord(manifest) && typeof manifest["source"] === "string" ? manifest["source"] : ""
        return { source, parts }
    }

    /** The stored rows of a part's table in the workspace, by natural key, with their source hash ("" when the table has none). */
    private async storedOf(
        manager: EntityManager,
        workspaceId: string,
        plan: EntityPlan,
        refs: rows.SnapshotRefs,
    ): Promise<Map<string, string>> {
        const stored = await manager.find(plan.target, { where: { workspaceId }, take: STORED_ROWS_MAX + 1 })
        if (stored.length > STORED_ROWS_MAX)
            throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity: "stored" } })
        return new Map(
            stored.map((row) => [
                plan.rowKey(row, refs),
                typeof row["sourceHash"] === "string" ? row["sourceHash"] : "",
            ]),
        )
    }

    /** The counts of one part against what the workspace stores. */
    private async counted(
        manager: EntityManager,
        workspaceId: string,
        part: SnapshotPart,
    ): Promise<SnapshotEntityCount> {
        const stored = await this.storedOf(manager, workspaceId, part.plan, await this.refsOf(manager, workspaceId))
        const hashed = part.plan.conflict !== null
        const states = part.items.map((item) => {
            const previous = stored.get(part.plan.itemKey(item))
            if (previous === undefined) return "inserted"
            return hashed && previous !== sha256Hex(canonicalJson(item)) ? "updated" : "unchanged"
        })
        const count = (state: string): number => states.filter((candidate) => candidate === state).length
        return {
            entity: part.entity,
            items: part.items.length,
            inserted: count("inserted"),
            updated: count("updated"),
            unchanged: count("unchanged"),
        }
    }

    /** The ids by natural key the later entities reference. */
    private async refsOf(tx: EntityManager, workspaceId: string): Promise<rows.SnapshotRefs> {
        const [customers, websites, projects, purchases] = await Promise.all([
            tx.find(CustomerEntity, { where: { workspaceId }, take: STORED_ROWS_MAX }),
            tx.find(WebsiteEntity, { where: { workspaceId }, take: STORED_ROWS_MAX }),
            tx.find(ProjectEntity, { where: { workspaceId }, take: STORED_ROWS_MAX }),
            tx.find(PurchaseEntity, { where: { workspaceId }, take: STORED_ROWS_MAX }),
        ])
        return {
            customers: new Map(customers.map((row) => [row.code, row.id])),
            websites: new Map(websites.map((row) => [row.domain, row.id])),
            projects: new Map(projects.map((row) => [row.code, { id: row.id, customerId: row.customerId }])),
            purchases: new Map(purchases.map((row) => [row.code, row.id])),
        }
    }

    /** Writes every part in order inside one transaction, recording the run and its counts. */
    private async written(tx: EntityManager, workspaceId: string, snapshot: Snapshot): Promise<SnapshotImportSummary> {
        const run = await tx.insert(ImportRunEntity, {
            workspaceId,
            sourceLabel: snapshot.source,
            startedAt: this.clock.now(),
            finishedAt: null,
            counts: {},
        })
        const runId = String(run.identifiers[0]?.["id"] ?? "")
        const entities = await eachInOrder(snapshot.parts, (part) => this.writtenPart(tx, workspaceId, runId, part))
        await tx.update(
            ImportRunEntity,
            { id: runId, workspaceId },
            { finishedAt: this.clock.now(), counts: { entities } },
        )
        return { executed: true, entities }
    }

    /** Writes the new and changed items of one part: upserted by natural key, or inserted when the table keeps no hash. */
    private async writtenPart(
        tx: EntityManager,
        workspaceId: string,
        runId: string,
        part: SnapshotPart,
    ): Promise<SnapshotEntityCount> {
        const count = await this.counted(tx, workspaceId, part)
        const refs = await this.refsOf(tx, workspaceId)
        const stored = await this.storedOf(tx, workspaceId, part.plan, refs)
        const changed = part.items.filter((item) => {
            const previous = stored.get(part.plan.itemKey(item))
            return (
                previous === undefined || (part.plan.conflict !== null && previous !== sha256Hex(canonicalJson(item)))
            )
        })
        const toWrite = changed.map((item) =>
            part.plan.rowOf(item, { workspaceId, runId, hash: sha256Hex(canonicalJson(item)) }, refs),
        )
        const chunks = Array.from({ length: Math.ceil(toWrite.length / CHUNK) }, (_, index) =>
            toWrite.slice(index * CHUNK, (index + 1) * CHUNK),
        )
        const conflict = part.plan.conflict
        await eachInOrder(chunks, (chunk) =>
            conflict === null ? tx.insert(part.plan.target, chunk) : tx.upsert(part.plan.target, chunk, [...conflict]),
        )
        return count
    }
}

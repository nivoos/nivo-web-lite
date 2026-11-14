import { Injectable } from "@nestjs/common"
import type { EntityManager } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { canonicalJson, eachInOrder, isRecord, sha256Hex } from "@modules/platform/primitives"
import { CrmImportLogEvent } from "./crm-import.log-events"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
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
    PurchaseEntity,
    PurchaseFollowupEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import { SNAPSHOT_ENTITIES, snapshotJsonOf } from "./snapshot-format.policy"
import { SnapshotFilesClient } from "./snapshot-files.client"
import * as items from "./snapshot-items.mapper"
import {
    SNAPSHOT_FORMAT,
    type SnapshotEntry,
    type SnapshotExportInput,
    type SnapshotExportSummary,
    type SnapshotItem,
} from "./snapshot.contracts"

/** What the CRM names as the source of its own exports. */
const EXPORT_SOURCE = "nivo-web-crm"

/** The most rows of one table a workspace is exported with; more is refused, never cut silently. */
const EXPORT_ROWS_MAX = 50_000

/** The rows of one table of the workspace, bounded. */
type Reader = (manager: EntityManager, workspaceId: string, names: items.SnapshotNames) => Promise<Array<SnapshotItem>>

/** How one entity of format @1 is read back out of its table, and the natural key fields its items are sorted by. */
interface ExportPlan {
    readonly read: Reader
    readonly key: ReadonlyArray<string>
}

/** The rows one table read takes: one more than the bound, so a table over it is seen and refused. */
const EXPORT_READ_MAX = EXPORT_ROWS_MAX + 1

/** The export plan of every entity of format @1 (a dotted key field reads into `origin`). */
const PLANS: ReadonlyMap<string, ExportPlan> = new Map<string, ExportPlan>([
    [
        "customers",
        {
            key: ["code"],
            read: async (m, w) =>
                (await m.find(CustomerEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.customerItemOf(r),
                ),
        },
    ],
    [
        "websites",
        {
            key: ["domain"],
            read: async (m, w, n) =>
                (await m.find(WebsiteEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.websiteItemOf(r, n),
                ),
        },
    ],
    [
        "providers",
        {
            key: ["key"],
            read: async (m, w) =>
                (await m.find(ProviderAccountEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.providerItemOf(r),
                ),
        },
    ],
    [
        "services",
        {
            key: ["code"],
            read: async (m, w, n) =>
                (await m.find(ServiceEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.serviceItemOf(r, n),
                ),
        },
    ],
    [
        "projects",
        {
            key: ["code"],
            read: async (m, w, n) =>
                (await m.find(ProjectEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.projectItemOf(r, n),
                ),
        },
    ],
    [
        "contracts",
        {
            key: ["contractNo"],
            read: async (m, w, n) =>
                (await m.find(ContractEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.contractItemOf(r, n),
                ),
        },
    ],
    [
        "documents",
        {
            key: ["path"],
            read: async (m, w, n) =>
                (await m.find(DocumentEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.documentItemOf(r, n),
                ),
        },
    ],
    [
        "invoices",
        {
            key: ["invoiceNo"],
            read: async (m, w) =>
                (await m.find(InvoiceEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.invoiceItemOf(r),
                ),
        },
    ],
    [
        "receivables",
        {
            key: ["projectCode"],
            read: async (m, w) =>
                (await m.find(ReceivableEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.receivableItemOf(r),
                ),
        },
    ],
    [
        "balances",
        {
            key: ["account", "partyCode"],
            read: async (m, w) =>
                (await m.find(LedgerBalanceEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.balanceItemOf(r),
                ),
        },
    ],
    [
        "contacts",
        {
            key: ["customerCode", "name"],
            read: async (m, w, n) =>
                (await m.find(ContactEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.contactItemOf(r, n),
                ),
        },
    ],
    [
        "purchases",
        {
            key: ["code"],
            read: async (m, w) =>
                (await m.find(PurchaseEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.purchaseItemOf(r),
                ),
        },
    ],
    [
        "purchase-followups",
        {
            key: ["purchaseCode", "day"],
            read: async (m, w, n) =>
                (await m.find(PurchaseFollowupEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.followUpItemOf(r, n),
                ),
        },
    ],
    [
        "issues",
        {
            key: ["entity", "origin.file", "origin.sheet", "origin.row", "field", "reason"],
            read: async (m, w) =>
                (await m.find(ImportIssueEntity, { where: { workspaceId: w }, take: EXPORT_READ_MAX })).map((r) =>
                    items.issueItemOf(r),
                ),
        },
    ],
])

/** The value of a (possibly dotted) field of an item, as text. */
const fieldOf = (item: SnapshotItem, field: string): string => {
    const [head, tail] = field.split(".")
    const value = item[String(head)]
    if (tail === undefined) return String(value)
    return String(isRecord(value) ? value[tail] : undefined)
}

/** Compares two texts by Unicode code point, as the format sorts (UTF-8 byte order is code point order). */
const byCodePoint = (left: string, right: string): number =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))

/** The items sorted by their natural key (fields joined by U+001F, code point order). */
const sortedBy = (list: ReadonlyArray<SnapshotItem>, key: ReadonlyArray<string>): Array<SnapshotItem> => {
    const keyed = list.map((item) => ({ key: key.map((field) => fieldOf(item, field)).join("\u001f"), item }))
    return keyed.toSorted((left, right) => byCodePoint(left.key, right.key)).map(({ item }) => item)
}

/** The plan of an entity of the format (every listed entity has one). */
export const planOf = (entity: string): ExportPlan => {
    const plan = PLANS.get(entity)
    if (plan === undefined) throw new CrmError({ code: CrmErrorCode.ImportManifestInvalid })
    return plan
}

@Injectable()
/**
 * The CRM's own export of a workspace in the data repository's format nivo-web-lite-data@1, the backup of record (owner
 * 2026-11-12: backup = push to the data repository): one canonical `data/<entity>.json` per entity, items by natural key with
 * natural keys only (no id, no workspace), plus the manifest of counts and digests. A file whose items did not change keeps its
 * earlier `exportedAt`, so an unchanged workspace gives no diff. The table-shaped @2 backup stays the fast local restore.
 */
export class SnapshotExportService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectLogger() private readonly logger: Logger,
        private readonly files: SnapshotFilesClient,
    ) {}

    /** Writes the workspace's snapshot under `out` and answers the counts per entity. */
    async export(input: SnapshotExportInput): Promise<SnapshotExportSummary> {
        const workspaceId = input.workspaceId.toLowerCase()
        const now = this.clock.now().toISOString()
        const names = await this.namesOf(workspaceId)
        const entries = await eachInOrder([...SNAPSHOT_ENTITIES], ([entity, format]) =>
            this.exported(input.out, workspaceId, entity, format.schema, names, now),
        )
        const manifest = { format: SNAPSHOT_FORMAT, snapshotAt: now, source: EXPORT_SOURCE, files: entries }
        await this.files.write(input.out, "manifest.json", canonicalJson(manifest))
        const summary = { entities: entries.map((entry) => ({ entity: entry.entity, items: entry.items })) }
        this.logger.info(CrmImportLogEvent.Exported, { ...summary })
        return summary
    }

    /** Customer, website and purchase ids of the workspace to their natural keys. */
    private async namesOf(workspaceId: string): Promise<items.SnapshotNames> {
        const [customers, websites, purchases] = await Promise.all([
            this.entityManager.find(CustomerEntity, { where: { workspaceId }, take: EXPORT_READ_MAX }),
            this.entityManager.find(WebsiteEntity, { where: { workspaceId }, take: EXPORT_READ_MAX }),
            this.entityManager.find(PurchaseEntity, { where: { workspaceId }, take: EXPORT_READ_MAX }),
        ])
        return {
            customers: new Map(customers.map((row) => [row.id, row.code])),
            websites: new Map(websites.map((row) => [row.id, row.domain])),
            purchases: new Map(purchases.map((row) => [row.id, row.code])),
        }
    }

    /** Writes one entity's file and answers its manifest entry. */
    private async exported(
        out: string,
        workspaceId: string,
        entity: string,
        schema: string,
        names: items.SnapshotNames,
        now: string,
    ): Promise<SnapshotEntry> {
        const plan = planOf(entity)
        const read = await plan.read(this.entityManager, workspaceId, names)
        if (read.length > EXPORT_ROWS_MAX)
            throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity } })
        const list = sortedBy(read, plan.key)
        const path = `data/${entity}.json`
        const exportedAt = (await this.unchangedSince(out, path, entity, list)) ?? now
        const text = canonicalJson({ schema, exportedAt, source: EXPORT_SOURCE, items: list })
        await this.files.write(out, path, text)
        return { path, entity, schema, items: list.length, sha256: sha256Hex(text) }
    }

    /** The `exportedAt` of the earlier file at `path` when it holds the same items from this source, else null. */
    private async unchangedSince(
        out: string,
        path: string,
        entity: string,
        list: ReadonlyArray<SnapshotItem>,
    ): Promise<string | null> {
        const bytes = await this.files.bytesOf(out, path)
        if (bytes === null) return null
        const previous = snapshotJsonOf(new TextDecoder().decode(bytes), CrmErrorCode.ImportFileInvalid, entity)
        const same =
            isRecord(previous) &&
            previous["source"] === EXPORT_SOURCE &&
            canonicalJson(previous["items"]) === canonicalJson(list)
        return same && isRecord(previous) && typeof previous["exportedAt"] === "string" ? previous["exportedAt"] : null
    }
}

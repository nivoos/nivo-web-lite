import { isRecord } from "@modules/platform/primitives"
import type { CustomerKind } from "./customer.contracts"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import type { ExpirySource, ServiceClass } from "./service.contracts"
import {
    SNAPSHOT_FORMAT,
    type SnapshotEntityFormat,
    type SnapshotEntry,
    type SnapshotFieldKind,
    type SnapshotItem,
} from "./snapshot.contracts"

const DATE = /^\d{4}-\d{2}-\d{2}$/u

/** The customer kinds of the format (schema enum). */
export const SNAPSHOT_CUSTOMER_KINDS: ReadonlyArray<CustomerKind> = ["company", "person", "unknown", "placeholder"]

/** The service classes of the format (schema enum). */
export const SNAPSHOT_SERVICE_CLASSES: ReadonlyArray<ServiceClass> = ["hosting", "domain", "ssl"]

/** The expiry sources of the format (schema enum). */
export const SNAPSHOT_EXPIRY_SOURCES: ReadonlyArray<ExpirySource> = [
    "provider",
    "estimated",
    "invoice",
    "confirmed",
    "none",
]

/** The provenance every sourced item carries: `origin { file, sheet, row }`. */
const ORIGIN: Readonly<Record<string, SnapshotFieldKind>> = { origin: "origin" }

/** One entity format of schema `nivo-web-lite-data/<entity>@1`. */
const formatOf = (entity: string, fields: Readonly<Record<string, SnapshotFieldKind>>): SnapshotEntityFormat => ({
    schema: `nivo-web-lite-data/${entity}@1`,
    fields,
})

/** The entity files of format @1, in import order (an entity after every entity it references by natural key). */
export const SNAPSHOT_ENTITIES: ReadonlyMap<string, SnapshotEntityFormat> = new Map([
    [
        "customers",
        formatOf("customers", {
            code: "text",
            kind: SNAPSHOT_CUSTOMER_KINDS,
            name: "text",
            taxId: "text?",
            address: "text?",
            phone: "text?",
            email: "text?",
            folderPath: "text?",
            ...ORIGIN,
        }),
    ],
    ["websites", formatOf("websites", { customerCode: "text", domain: "text", ...ORIGIN })],
    ["providers", formatOf("providers", { key: "text", mode: "text", plugin: "text" })],
    [
        "services",
        formatOf("services", {
            code: "text",
            customerCode: "text",
            domain: "text?",
            class: SNAPSHOT_SERVICE_CLASSES,
            provider: "text",
            status: "text",
            statusText: "text?",
            startsOn: "date?",
            expiresOn: "date?",
            expiryBasis: "text?",
            expirySource: SNAPSHOT_EXPIRY_SOURCES,
            note: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "projects",
        formatOf("projects", {
            code: "text",
            customerCode: "text",
            domain: "text?",
            name: "text",
            contractNo: "text?",
            contractState: "text?",
            value: "money?",
            collected: "money?",
            remaining: "money?",
            startsOn: "date?",
            endsOn: "date?",
            statusText: "text?",
            note: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "contracts",
        formatOf("contracts", {
            contractNo: "text",
            kind: "text",
            customerCode: "text?",
            partnerName: "text?",
            content: "text?",
            value: "money?",
            signedOn: "date?",
            effectiveOn: "date?",
            expiresOn: "date?",
            autoRenew: "bool?",
            warrantyUntil: "date?",
            ownerName: "text?",
            statusText: "text?",
            storageRef: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "documents",
        formatOf("documents", {
            path: "text",
            customerCode: "text?",
            kind: "text",
            invoiceNo: "text?",
            contractNo: "text?",
            fileName: "text",
            sizeBytes: "int",
            sha256: "text",
        }),
    ],
    [
        "invoices",
        formatOf("invoices", {
            invoiceNo: "text",
            customerCode: "text?",
            issuedOn: "date?",
            amount: "money?",
            documentPath: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "receivables",
        formatOf("receivables", {
            projectCode: "text",
            contractRef: "text?",
            total: "money?",
            collected: "money?",
            remaining: "money?",
            invoicedNote: "text?",
            projectState: "text?",
            salesOwner: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "balances",
        formatOf("balances", {
            account: "text",
            partyCode: "text",
            partyName: "text?",
            openingDebit: "money?",
            openingCredit: "money?",
            debit: "money?",
            credit: "money?",
            closingDebit: "money?",
            closingCredit: "money?",
            note: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "contacts",
        formatOf("contacts", {
            customerCode: "text",
            name: "text",
            phone: "text?",
            email: "text?",
            role: "text?",
            ...ORIGIN,
        }),
    ],
    [
        "issues",
        formatOf("issues", {
            entity: "text",
            field: "text",
            reason: "text",
            severity: "text",
            raw: "object",
            ...ORIGIN,
        }),
    ],
])

/** Whether `value` is a format @1 money value `{ amount: <integer>, currency: "VND" }`. */
const isMoney = (value: unknown): boolean =>
    isRecord(value) && Number.isSafeInteger(value["amount"]) && value["currency"] === "VND"

/** Whether `value` is a provenance `{ file, sheet, row }`. */
const isOrigin = (value: unknown): boolean =>
    isRecord(value) &&
    typeof value["file"] === "string" &&
    typeof value["sheet"] === "string" &&
    Number.isSafeInteger(value["row"])

/** Whether one field value fits its kind; a nullable kind admits null, never the empty string as "no value". */
const fits = (kind: SnapshotFieldKind, value: unknown): boolean => {
    if (typeof kind !== "string") return typeof value === "string" && kind.includes(value)
    if (kind.endsWith("?") && value === null) return true
    switch (kind) {
        case "text":
        case "text?":
            return typeof value === "string" && (kind === "text" || value !== "")
        case "int":
            return Number.isSafeInteger(value)
        case "bool?":
            return typeof value === "boolean"
        case "date?":
            return typeof value === "string" && DATE.test(value)
        case "money?":
            return isMoney(value)
        case "origin":
            return isOrigin(value)
        case "object":
            return isRecord(value)
    }
}

/** The checked items of one parsed file of `entity`, or CRM_IMPORT_FILE_INVALID / CRM_IMPORT_ITEM_INVALID. */
export const snapshotItemsOf = (entity: string, file: unknown, entry: SnapshotEntry): ReadonlyArray<SnapshotItem> => {
    const format = SNAPSHOT_ENTITIES.get(entity)
    if (format === undefined || !isRecord(file) || file["schema"] !== format.schema || entry.schema !== format.schema) {
        throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity } })
    }
    const items: unknown = file["items"]
    if (!Array.isArray(items) || items.length !== entry.items) {
        throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity } })
    }
    const list: ReadonlyArray<unknown> = items
    return list.map((item, index) => {
        const valid = isRecord(item) && Object.entries(format.fields).every(([field, kind]) => fits(kind, item[field]))
        if (!valid || !isRecord(item))
            throw new CrmError({ code: CrmErrorCode.ImportItemInvalid, params: { entity, index } })
        return item
    })
}

/** Whether a value is a manifest entry. */
const isEntry = (value: unknown): value is SnapshotEntry =>
    isRecord(value) &&
    typeof value["path"] === "string" &&
    typeof value["entity"] === "string" &&
    typeof value["schema"] === "string" &&
    Number.isSafeInteger(value["items"]) &&
    typeof value["sha256"] === "string"

/** The entries of a parsed `manifest.json` of format @1; another format, an unknown entity or a malformed entry is refused. */
export const snapshotEntriesOf = (manifest: unknown): ReadonlyArray<SnapshotEntry> => {
    const files: unknown = isRecord(manifest) && manifest["format"] === SNAPSHOT_FORMAT ? manifest["files"] : undefined
    if (!Array.isArray(files)) throw new CrmError({ code: CrmErrorCode.ImportManifestInvalid })
    const list: ReadonlyArray<unknown> = files
    const entries = list.filter((entry) => isEntry(entry))
    if (entries.length !== list.length || entries.some((entry) => !SNAPSHOT_ENTITIES.has(entry.entity))) {
        throw new CrmError({ code: CrmErrorCode.ImportManifestInvalid })
    }
    return entries
}

/** The parsed JSON of a snapshot file, or `code` naming `entity`, with the parse failure as its cause. */
export const snapshotJsonOf = (text: string, code: CrmErrorCode, entity: string): unknown => {
    try {
        return JSON.parse(text)
    } catch (cause) {
        throw new CrmError({ code, params: { entity }, cause })
    }
}

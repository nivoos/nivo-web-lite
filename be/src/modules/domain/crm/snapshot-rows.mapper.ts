import { isRecord } from "@modules/platform/primitives"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import type {
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
import type { SnapshotItem } from "./snapshot.contracts"
import { SNAPSHOT_CUSTOMER_KINDS, SNAPSHOT_EXPIRY_SOURCES, SNAPSHOT_SERVICE_CLASSES } from "./snapshot-format.policy"

/** The ids the import resolved so far, by natural key, for the references of later entities. */
export interface SnapshotRefs {
    /** Customer code to id. */
    readonly customers: ReadonlyMap<string, string>
    /** Website domain to id. */
    readonly websites: ReadonlyMap<string, string>
    /** Project code to its id and customer id. */
    readonly projects: ReadonlyMap<string, { readonly id: string; readonly customerId: string }>
}

/** What every sourced row of one import carries: its workspace, the run and the item's content hash. */
export interface SnapshotStamp {
    /** The enterprise workspace the snapshot is bound to. */
    readonly workspaceId: string
    /** The import run. */
    readonly runId: string
    /** The sha256 of the item's canonical JSON: an unchanged item is not written again. */
    readonly hash: string
}

/** A checked text field. */
const text = (item: SnapshotItem, field: string): string => String(item[field])

/** A checked field of a closed value set, as its type; a value outside the set is CRM_IMPORT_ITEM_INVALID. */
const oneOf = <T extends string>(values: ReadonlyArray<T>, item: SnapshotItem, field: string): T => {
    const value = values.find((candidate) => candidate === item[field])
    if (value === undefined) throw new CrmError({ code: CrmErrorCode.ImportItemInvalid, params: { field } })
    return value
}

/** A checked nullable text field. */
const textOrNull = (item: SnapshotItem, field: string): string | null => {
    const value = item[field]
    return typeof value === "string" ? value : null
}

/** A checked nullable boolean field. */
const boolOrNull = (item: SnapshotItem, field: string): boolean | null => {
    const value = item[field]
    return typeof value === "boolean" ? value : null
}

/** The whole VND of a checked money field, or null when the source has none. */
const amountOf = (item: SnapshotItem, field: string): number | null => {
    const value = item[field]
    return isRecord(value) && typeof value["amount"] === "number" ? value["amount"] : null
}

/** The source place of an item (`origin { file, sheet, row }`). */
const placeOf = (item: SnapshotItem) => {
    const origin = item["origin"]
    return {
        sourceFile: isRecord(origin) ? String(origin["file"]) : "",
        sourceSheet: isRecord(origin) ? String(origin["sheet"]) : "",
        sourceRow: isRecord(origin) && typeof origin["row"] === "number" ? origin["row"] : 0,
    }
}

/** The provenance columns of a sourced item (`origin { file, sheet, row }`). */
const provenanceOf = (item: SnapshotItem, stamp: SnapshotStamp) => ({
    ...placeOf(item),
    sourceHash: stamp.hash,
    lastImportRunId: stamp.runId,
})

/** The id of a required reference, or CRM_IMPORT_REFERENCE_UNKNOWN naming the entity and the field. */
const required = (map: ReadonlyMap<string, string>, key: string, entity: string, field: string): string => {
    const id = map.get(key)
    if (id === undefined) throw new CrmError({ code: CrmErrorCode.ImportReferenceUnknown, params: { entity, field } })
    return id
}

/** The id of a soft reference (null when the key is null or unknown). */
const soft = (map: ReadonlyMap<string, string>, key: string | null): string | null =>
    key === null ? null : (map.get(key) ?? null)

/** A customer row. A customer is reachable when the books hold a phone or a mailbox for it. */
export const customerRowOf = (item: SnapshotItem, stamp: SnapshotStamp): Partial<CustomerEntity> => ({
    workspaceId: stamp.workspaceId,
    code: text(item, "code"),
    kind: oneOf(SNAPSHOT_CUSTOMER_KINDS, item, "kind"),
    name: text(item, "name"),
    taxId: textOrNull(item, "taxId"),
    address: textOrNull(item, "address"),
    phone: textOrNull(item, "phone"),
    email: textOrNull(item, "email"),
    folderPath: textOrNull(item, "folderPath"),
    reachable: textOrNull(item, "phone") !== null || textOrNull(item, "email") !== null,
    ...provenanceOf(item, stamp),
})

/** A website row. */
export const websiteRowOf = (item: SnapshotItem, stamp: SnapshotStamp, refs: SnapshotRefs): Partial<WebsiteEntity> => ({
    workspaceId: stamp.workspaceId,
    domain: text(item, "domain"),
    customerId: required(refs.customers, text(item, "customerCode"), "websites", "customerCode"),
    ...provenanceOf(item, stamp),
})

/** A provider account row: the provider key, labelled by itself, in its mode. */
export const providerRowOf = (item: SnapshotItem, workspaceId: string): Partial<ProviderAccountEntity> => ({
    workspaceId,
    provider: text(item, "key"),
    label: text(item, "key"),
    mode: text(item, "mode"),
    plugin: text(item, "plugin"),
})

/** A service row; the empty provider of the format is no provider. */
export const serviceRowOf = (item: SnapshotItem, stamp: SnapshotStamp, refs: SnapshotRefs): Partial<ServiceEntity> => ({
    workspaceId: stamp.workspaceId,
    code: text(item, "code"),
    customerId: required(refs.customers, text(item, "customerCode"), "services", "customerCode"),
    websiteId: soft(refs.websites, textOrNull(item, "domain")),
    serviceClass: oneOf(SNAPSHOT_SERVICE_CLASSES, item, "class"),
    provider: text(item, "provider") === "" ? null : text(item, "provider"),
    status: text(item, "status"),
    statusText: textOrNull(item, "statusText"),
    startsOn: textOrNull(item, "startsOn"),
    expiresOn: textOrNull(item, "expiresOn"),
    expirySource: oneOf(SNAPSHOT_EXPIRY_SOURCES, item, "expirySource"),
    expiryBasis: textOrNull(item, "expiryBasis"),
    note: textOrNull(item, "note"),
    ...provenanceOf(item, stamp),
})

/** A project row. */
export const projectRowOf = (item: SnapshotItem, stamp: SnapshotStamp, refs: SnapshotRefs): Partial<ProjectEntity> => ({
    workspaceId: stamp.workspaceId,
    code: text(item, "code"),
    customerId: required(refs.customers, text(item, "customerCode"), "projects", "customerCode"),
    websiteId: soft(refs.websites, textOrNull(item, "domain")),
    name: text(item, "name"),
    contractNo: textOrNull(item, "contractNo"),
    contractState: textOrNull(item, "contractState"),
    valueVnd: amountOf(item, "value"),
    collectedVnd: amountOf(item, "collected"),
    remainingVnd: amountOf(item, "remaining"),
    startsOn: textOrNull(item, "startsOn"),
    endsOn: textOrNull(item, "endsOn"),
    statusText: textOrNull(item, "statusText"),
    note: textOrNull(item, "note"),
    ...provenanceOf(item, stamp),
})

/** A contract row. */
export const contractRowOf = (
    item: SnapshotItem,
    stamp: SnapshotStamp,
    refs: SnapshotRefs,
): Partial<ContractEntity> => ({
    workspaceId: stamp.workspaceId,
    contractNo: text(item, "contractNo"),
    kind: text(item, "kind"),
    partnerName: textOrNull(item, "partnerName"),
    customerId: soft(refs.customers, textOrNull(item, "customerCode")),
    content: textOrNull(item, "content"),
    valueVnd: amountOf(item, "value"),
    signedOn: textOrNull(item, "signedOn"),
    effectiveOn: textOrNull(item, "effectiveOn"),
    expiresOn: textOrNull(item, "expiresOn"),
    autoRenew: boolOrNull(item, "autoRenew"),
    warrantyUntil: textOrNull(item, "warrantyUntil"),
    ownerName: textOrNull(item, "ownerName"),
    statusText: textOrNull(item, "statusText"),
    storageRef: textOrNull(item, "storageRef"),
    ...provenanceOf(item, stamp),
})

/** A document index row; a document has no source row, so its provenance is its own path. */
export const documentRowOf = (
    item: SnapshotItem,
    stamp: SnapshotStamp,
    refs: SnapshotRefs,
): Partial<DocumentEntity> => ({
    workspaceId: stamp.workspaceId,
    path: text(item, "path"),
    customerId: soft(refs.customers, textOrNull(item, "customerCode")),
    kind: text(item, "kind"),
    invoiceNo: textOrNull(item, "invoiceNo"),
    contractNo: textOrNull(item, "contractNo"),
    fileName: text(item, "fileName"),
    sizeBytes: Number(item["sizeBytes"]),
    sha256: text(item, "sha256"),
    ...provenanceOf({ origin: { file: text(item, "path"), sheet: "", row: 0 } }, stamp),
})

/** An invoice row. */
export const invoiceRowOf = (item: SnapshotItem, stamp: SnapshotStamp, refs: SnapshotRefs): Partial<InvoiceEntity> => ({
    workspaceId: stamp.workspaceId,
    invoiceNo: text(item, "invoiceNo"),
    customerId: soft(refs.customers, textOrNull(item, "customerCode")),
    customerCode: textOrNull(item, "customerCode"),
    issuedOn: textOrNull(item, "issuedOn"),
    amountVnd: amountOf(item, "amount"),
    documentPath: textOrNull(item, "documentPath"),
    ...provenanceOf(item, stamp),
})

/** A receivable row; its project (and through it the customer) is a soft reference; a missing amount stays null. */
export const receivableRowOf = (
    item: SnapshotItem,
    stamp: SnapshotStamp,
    refs: SnapshotRefs,
): Partial<ReceivableEntity> => {
    const project = refs.projects.get(text(item, "projectCode"))
    return {
        workspaceId: stamp.workspaceId,
        projectCode: text(item, "projectCode"),
        projectId: project?.id ?? null,
        customerId: project?.customerId ?? null,
        contractRef: textOrNull(item, "contractRef"),
        totalVnd: amountOf(item, "total"),
        collectedVnd: amountOf(item, "collected"),
        remainingVnd: amountOf(item, "remaining"),
        dueOn: null,
        invoicedNote: textOrNull(item, "invoicedNote"),
        projectState: textOrNull(item, "projectState"),
        salesOwner: textOrNull(item, "salesOwner"),
        ...provenanceOf(item, stamp),
    }
}

/** A TK131 / TK331 balance row; the party code is the books' own code, linked to no customer; a missing amount stays null. */
export const balanceRowOf = (item: SnapshotItem, stamp: SnapshotStamp): Partial<LedgerBalanceEntity> => ({
    workspaceId: stamp.workspaceId,
    account: text(item, "account"),
    partyCode: text(item, "partyCode"),
    partyName: textOrNull(item, "partyName"),
    customerId: null,
    openingDebitVnd: amountOf(item, "openingDebit"),
    openingCreditVnd: amountOf(item, "openingCredit"),
    debitVnd: amountOf(item, "debit"),
    creditVnd: amountOf(item, "credit"),
    closingDebitVnd: amountOf(item, "closingDebit"),
    closingCreditVnd: amountOf(item, "closingCredit"),
    note: textOrNull(item, "note"),
    ...provenanceOf(item, stamp),
})

/** A contact row of a known customer; the format has no messaging handle or preferred channel. */
export const contactRowOf = (item: SnapshotItem, workspaceId: string, refs: SnapshotRefs): Partial<ContactEntity> => ({
    workspaceId,
    customerId: required(refs.customers, text(item, "customerCode"), "contacts", "customerCode"),
    name: text(item, "name"),
    phone: textOrNull(item, "phone"),
    email: textOrNull(item, "email"),
    zaloId: null,
    preferredChannel: null,
    role: textOrNull(item, "role"),
    ...placeOf(item),
})

/** An import issue row (a rejected or warned source row, with its cells as the source wrote them). */
export const issueRowOf = (item: SnapshotItem, stamp: SnapshotStamp): Partial<ImportIssueEntity> => {
    const provenance = provenanceOf(item, stamp)
    const raw = item["raw"]
    return {
        workspaceId: stamp.workspaceId,
        sourceFile: provenance.sourceFile,
        sourceSheet: provenance.sourceSheet,
        sourceRow: provenance.sourceRow,
        field: text(item, "field"),
        reason: text(item, "reason"),
        severity: text(item, "severity"),
        entity: text(item, "entity"),
        raw: isRecord(raw) ? raw : {},
        lastImportRunId: stamp.runId,
    }
}

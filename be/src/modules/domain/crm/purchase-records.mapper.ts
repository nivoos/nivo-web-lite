import { createHash } from "node:crypto"
import type {
    ContractEntity,
    ProjectEntity,
    PurchaseEntity,
    ReceivableEntity,
    ServiceEntity,
} from "./persistence/entities"
import type { ServiceClass } from "./service.contracts"

/** The provenance of a record the CRM opens itself (no source row). */
/** The provenance columns every sourced row carries. */
export interface CrmProvenance {
    /** The source file (`crm` for a record the CRM opened). */
    readonly sourceFile: string
    /** The source sheet (`purchase`). */
    readonly sourceSheet: string
    /** The source row (0). */
    readonly sourceRow: number
    /** The sha256 of the record's own key. */
    readonly sourceHash: string
    /** No import run opened it. */
    readonly lastImportRunId: null
}

/** The provenance of a record the CRM opens itself (no source row). */
export const crmProvenance = (key: string): CrmProvenance => ({
    sourceFile: "crm",
    sourceSheet: "purchase",
    sourceRow: 0,
    sourceHash: createHash("sha256").update(key, "utf8").digest("hex"),
    lastImportRunId: null,
})

/** The 8-character suffix of a purchase code (`MUA-XXXXXXXX`). */
export const suffixOf = (code: string): string => code.slice("MUA-".length)

/** The project an accepted website build opens. */
export const projectRowOf = (
    purchase: PurchaseEntity,
    customerId: string,
    projectCode: string,
): Partial<ProjectEntity> => ({
    workspaceId: purchase.workspaceId,
    code: projectCode,
    customerId,
    websiteId: null,
    name: purchase.need.slice(0, 200),
    contractNo: purchase.contractNo,
    contractState: null,
    valueVnd: purchase.netVnd,
    collectedVnd: 0,
    remainingVnd: purchase.totalVnd,
    startsOn: null,
    endsOn: null,
    statusText: null,
    note: null,
    ...crmProvenance(projectCode),
})

/** A service an acceptance opens: ordered, not yet active (`pending`). */
export const serviceRowOf = (
    workspaceId: string,
    customerId: string,
    code: string,
    serviceClass: ServiceClass,
): Partial<ServiceEntity> => ({
    workspaceId,
    code,
    customerId,
    websiteId: null,
    serviceClass,
    provider: null,
    status: "pending",
    statusText: null,
    startsOn: null,
    expiresOn: null,
    expirySource: "none",
    expiryBasis: null,
    note: null,
    ...crmProvenance(code),
})

/** The contract record of an accepted purchase. */
export const contractRowOf = (
    purchase: PurchaseEntity,
    customerId: string,
    contractNo: string,
): Partial<ContractEntity> => ({
    workspaceId: purchase.workspaceId,
    contractNo,
    kind: "sale",
    partnerName: null,
    customerId,
    content: null,
    valueVnd: purchase.netVnd,
    signedOn: null,
    effectiveOn: null,
    expiresOn: null,
    autoRenew: null,
    warrantyUntil: null,
    ownerName: null,
    statusText: null,
    storageRef: null,
    ...crmProvenance(contractNo),
})

/** The receivable of an accepted purchase: ONE for the whole total (no terms table yet, AGENTS-GRAPHS §9.12 K-7). */
export const receivableRowOf = (
    purchase: PurchaseEntity,
    customerId: string,
    projectCode: string,
    contractNo: string,
): Partial<ReceivableEntity> => ({
    workspaceId: purchase.workspaceId,
    projectCode,
    projectId: null,
    customerId,
    contractRef: contractNo,
    totalVnd: purchase.totalVnd,
    collectedVnd: 0,
    remainingVnd: purchase.totalVnd,
    dueOn: null,
    invoicedNote: null,
    projectState: null,
    salesOwner: null,
    ...crmProvenance(`receivable:${purchase.code}`),
})

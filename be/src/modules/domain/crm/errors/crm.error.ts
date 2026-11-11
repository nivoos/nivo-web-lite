import { DomainError, type ErrorKind } from "@modules/platform/errors"

/** Codes of the CRM capability. */
export enum CrmErrorCode {
    /** No customer with this code in the workspace. */
    CustomerNotFound = "CRM_CUSTOMER_NOT_FOUND",
    /** No service with this code in the workspace. */
    ServiceNotFound = "CRM_SERVICE_NOT_FOUND",
    /** No receivable with this project code in the workspace. */
    ReceivableNotFound = "CRM_RECEIVABLE_NOT_FOUND",
    /** No TK331 balance with this party code in the workspace. */
    PayableNotFound = "CRM_PAYABLE_NOT_FOUND",
    /** No renewal request with this id in the workspace. */
    RenewalNotFound = "CRM_RENEWAL_NOT_FOUND",
    /** No ticket with this id in the workspace. */
    TicketNotFound = "CRM_TICKET_NOT_FOUND",
    /** No invoice draft with this id in the workspace. */
    InvoiceDraftNotFound = "CRM_INVOICE_DRAFT_NOT_FOUND",
    /** A ticket names a service code the workspace does not have (`serviceCode` param). */
    TicketServiceUnknown = "CRM_TICKET_SERVICE_UNKNOWN",
    /** The Idempotency-Key was first used with another request. */
    IdempotencyKeyReused = "CRM_IDEMPOTENCY_KEY_REUSED",
    /** The provider renewal is refused: the request is not paid (`state` param). Pay first (owner, 2026-11-12). */
    RenewalNotPaid = "CRM_RENEWAL_NOT_PAID",
    /** The request's state does not allow this step (`state` param). */
    RenewalStateRefused = "CRM_RENEWAL_STATE_REFUSED",
    /** The service already has an open renewal request (`renewalId` param). */
    RenewalOpenExists = "CRM_RENEWAL_OPEN_EXISTS",
    /** The renewal request belongs to another service (`serviceCode` param). */
    RenewalServiceMismatch = "CRM_RENEWAL_SERVICE_MISMATCH",
    /** No price for this service class and term (`serviceClass`, `termMonths` params). */
    PriceUnknown = "CRM_PRICE_UNKNOWN",
    /** The service's status does not allow a renewal (`status` param). */
    ServiceNotRenewable = "CRM_SERVICE_NOT_RENEWABLE",
    /** This bank transaction already proved another payment. */
    TransactionUsed = "CRM_TRANSACTION_USED",
    /** The ticket's status does not allow this change (`from`, `to` params). */
    TicketTransitionRefused = "CRM_TICKET_TRANSITION_REFUSED",
    /** A ticket update with neither a note nor a status. */
    TicketUpdateEmpty = "CRM_TICKET_UPDATE_EMPTY",
    /** The provider plugin could not answer. */
    ProviderUnavailable = "CRM_PROVIDER_UNAVAILABLE",
    /** No `Authorization: Bearer <id>.<secret>`, or not a live service credential. */
    ServiceKeyRejected = "CRM_SERVICE_KEY_REJECTED",
    /** `Idempotency-Key` is absent or outside `[A-Za-z0-9._:-]{1,200}`. */
    IdempotencyKeyInvalid = "CRM_IDEMPOTENCY_KEY_INVALID",
    /** A credential to issue names no uuid workspace. */
    CredentialWorkspaceInvalid = "CRM_CREDENTIAL_WORKSPACE_INVALID",
    /** A credential label is empty or longer than 120 characters. */
    CredentialLabelInvalid = "CRM_CREDENTIAL_LABEL_INVALID",
    /** No live service credential has this id. */
    CredentialNotFound = "CRM_CREDENTIAL_NOT_FOUND",
    /** The customer has no document with this path. */
    DocumentNotFound = "CRM_DOCUMENT_NOT_FOUND",
    /** The document's original is not uploaded to the storage yet. */
    DocumentNotStored = "CRM_DOCUMENT_NOT_STORED",
    /** The workspace an import binds a snapshot to is no uuid. */
    ImportWorkspaceInvalid = "CRM_IMPORT_WORKSPACE_INVALID",
    /** A snapshot has no `manifest.json` of format `nivo-web-lite-data@1`, or it names an entity the format does not have. */
    ImportManifestInvalid = "CRM_IMPORT_MANIFEST_INVALID",
    /** A snapshot file is missing, is not the text its manifest digests, or is not its entity's schema @1 (`entity` param). */
    ImportFileInvalid = "CRM_IMPORT_FILE_INVALID",
    /** An item lacks a field of its entity or carries a mistyped one (`entity`, `index` or `field` param). */
    ImportItemInvalid = "CRM_IMPORT_ITEM_INVALID",
    /** An item names a customer (by code) the snapshot does not hold (`entity`, `field` param). */
    ImportReferenceUnknown = "CRM_IMPORT_REFERENCE_UNKNOWN",
}

/** How each CRM code travels. */
export const CRM_ERROR_KINDS: Record<CrmErrorCode, ErrorKind> = {
    [CrmErrorCode.CustomerNotFound]: "not-found",
    [CrmErrorCode.ServiceNotFound]: "not-found",
    [CrmErrorCode.ReceivableNotFound]: "not-found",
    [CrmErrorCode.PayableNotFound]: "not-found",
    [CrmErrorCode.RenewalNotFound]: "not-found",
    [CrmErrorCode.TicketNotFound]: "not-found",
    [CrmErrorCode.InvoiceDraftNotFound]: "not-found",
    [CrmErrorCode.TicketServiceUnknown]: "invalid",
    [CrmErrorCode.IdempotencyKeyReused]: "conflict",
    [CrmErrorCode.RenewalNotPaid]: "conflict",
    [CrmErrorCode.RenewalStateRefused]: "conflict",
    [CrmErrorCode.RenewalOpenExists]: "conflict",
    [CrmErrorCode.RenewalServiceMismatch]: "conflict",
    [CrmErrorCode.PriceUnknown]: "conflict",
    [CrmErrorCode.ServiceNotRenewable]: "conflict",
    [CrmErrorCode.TransactionUsed]: "conflict",
    [CrmErrorCode.TicketTransitionRefused]: "conflict",
    [CrmErrorCode.TicketUpdateEmpty]: "invalid",
    [CrmErrorCode.ProviderUnavailable]: "unavailable",
    [CrmErrorCode.ServiceKeyRejected]: "unauthenticated",
    [CrmErrorCode.IdempotencyKeyInvalid]: "invalid",
    [CrmErrorCode.CredentialWorkspaceInvalid]: "invalid",
    [CrmErrorCode.CredentialLabelInvalid]: "invalid",
    [CrmErrorCode.CredentialNotFound]: "not-found",
    [CrmErrorCode.DocumentNotFound]: "not-found",
    [CrmErrorCode.DocumentNotStored]: "conflict",
    [CrmErrorCode.ImportWorkspaceInvalid]: "invalid",
    [CrmErrorCode.ImportManifestInvalid]: "invalid",
    [CrmErrorCode.ImportFileInvalid]: "invalid",
    [CrmErrorCode.ImportItemInvalid]: "invalid",
    [CrmErrorCode.ImportReferenceUnknown]: "invalid",
}

/** The one error class of the CRM capability. */
export class CrmError extends DomainError<CrmErrorCode> {}

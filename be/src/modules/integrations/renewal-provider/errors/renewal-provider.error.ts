import { DomainError, type ErrorKind } from "@modules/platform/errors"

/** Codes of the renewal provider port. */
export enum RenewalProviderErrorCode {
    /** `CRM_PROVIDER_PLUGINS` is not `<provider>=<manual|mock>,...` (`key` param); boot stops. */
    PluginsInvalid = "RENEWAL_PROVIDER_PLUGINS_INVALID",
}

/** How each provider port code travels. */
export const RENEWAL_PROVIDER_ERROR_KINDS: Record<RenewalProviderErrorCode, ErrorKind> = {
    [RenewalProviderErrorCode.PluginsInvalid]: "internal",
}

/** The one error class of the renewal provider port. */
export class RenewalProviderError extends DomainError<RenewalProviderErrorCode> {}

/** The plugins behind the provider port. iNET, Tino and AZ have no live plugin yet (owner, 2026-11-12): fixture or manual. */
export type ProviderPluginName = "manual" | "fixture"

/** The provider key a service names (tino, inet, azwebsite, manual), or null when the books name none. */
export type ProviderKey = string | null

/** What a plugin is told about a service. */
export interface ProviderServiceFacts {
    /** The CRM's service code. */
    readonly serviceCode: string
    /** The provider key the CRM stores (tino, inet, azwebsite, manual) or null. */
    readonly provider: string | null
    /** The end date the CRM stores. */
    readonly expiresOn: string | null
    /** Today in Ho Chi Minh. */
    readonly today: string
}

/** What a plugin answers about a service's state. */
export interface ProviderStatus {
    /** The plugin. */
    readonly plugin: ProviderPluginName
    /** active, expired or unknown. */
    readonly state: "active" | "expired" | "unknown"
    /** The end date the plugin knows. */
    readonly expiresOn: string | null
    /** Who stands behind the answer. */
    readonly checkedBy: "person" | "fixture"
    /** A fixed label. */
    readonly note: string
}

/** A renewal asked of a plugin. */
export interface ProviderRenewRequest extends ProviderServiceFacts {
    /** The CRM's renewal request id. */
    readonly renewalId: string
    /** The term, months. */
    readonly termMonths: number
    /** True: ask no real provider. */
    readonly dryRun: boolean
}

/** What a plugin did. */
export interface ProviderRenewResult {
    /** The plugin. */
    readonly plugin: ProviderPluginName
    /** pending_person: a person renews and confirms; renewed / failed: the plugin's own answer. */
    readonly state: "pending_person" | "renewed" | "failed"
    /** The provider's (or the mock's) reference. */
    readonly providerRef: string | null
    /** The end date after the renewal, when the plugin knows it. */
    readonly newExpiresOn: string | null
    /** True when nothing external was asked. */
    readonly dryRun: boolean
}

/** One provider plugin. */
export interface RenewalProviderPlugin {
    /** Its name. */
    readonly name: ProviderPluginName
    /** The service's state. */
    status(facts: ProviderServiceFacts): Promise<ProviderStatus>
    /** Renews the service (or records that a person must). */
    renew(request: ProviderRenewRequest): Promise<ProviderRenewResult>
}

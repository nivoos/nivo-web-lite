import type { ProviderPluginName } from "./renewal-provider.port"

/** Which plugin takes each provider key; a key not listed (and `manual`, and a service without provider) goes to `manual`. */
export interface RenewalProviderOptions {
    /** provider key -> plugin. */
    readonly plugins: Readonly<Record<string, ProviderPluginName>>
}

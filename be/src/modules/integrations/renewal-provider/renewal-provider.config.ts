import type { EnvSource } from "@modules/platform/config"
import { RenewalProviderError, RenewalProviderErrorCode } from "./errors/renewal-provider.error"
import type { RenewalProviderOptions } from "./renewal-provider.options"
import type { ProviderPluginName } from "./renewal-provider.port"

/** The default routing (a tunable): iNET and Tino mocked, AZ by a person (owner 2026-11-12); no live plugin exists to name. */
export const DEFAULT_PROVIDER_PLUGINS = "inet=fixture,tino=fixture,azwebsite=manual"

const isPlugin = (value: string | undefined): value is ProviderPluginName => value === "manual" || value === "fixture"

/** Parses `CRM_PROVIDER_PLUGINS` (`<provider>=<manual|fixture>,...`), a tunable that defaults to DEFAULT_PROVIDER_PLUGINS. */
export const parseRenewalProviderConfig = (env: EnvSource): RenewalProviderOptions => {
    const text = env.optional("CRM_PROVIDER_PLUGINS") ?? DEFAULT_PROVIDER_PLUGINS
    const plugins: Record<string, ProviderPluginName> = {}
    for (const pair of text.split(",")) {
        const [provider, plugin] = pair.trim().split("=")
        if (provider === undefined || provider === "" || !isPlugin(plugin)) {
            throw new RenewalProviderError({
                code: RenewalProviderErrorCode.PluginsInvalid,
                params: { key: "CRM_PROVIDER_PLUGINS" },
            })
        }
        plugins[provider] = plugin
    }
    return { plugins }
}

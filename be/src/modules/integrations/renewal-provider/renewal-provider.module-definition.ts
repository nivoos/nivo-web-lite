import { defineCapabilityModule } from "@starci/nest-kit"
import { RENEWAL_PROVIDER_OPTIONS } from "./renewal-provider.decorators"
import type { RenewalProviderOptions } from "./renewal-provider.options"

/** The configurable-module base of the renewal provider port; `isGlobal` is decided by the app root. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    defineCapabilityModule<RenewalProviderOptions>({
        optionsInjectionToken: RENEWAL_PROVIDER_OPTIONS,
    })

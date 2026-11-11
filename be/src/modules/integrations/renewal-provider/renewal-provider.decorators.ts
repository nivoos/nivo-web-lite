import { injector, type TypedParameterDecorator } from "@modules/platform/composition"
import type { RenewalProviderOptions } from "./renewal-provider.options"
import type { RenewalProviderService } from "./renewal-provider.service"

/** Token of the provider port's options. */
export const RENEWAL_PROVIDER_OPTIONS: unique symbol = Symbol("integrations.renewal-provider.options")

/** Injects the provider port's options. Parameter type: RenewalProviderOptions. */
export const InjectRenewalProviderOptions = (): TypedParameterDecorator<RenewalProviderOptions> =>
    injector<RenewalProviderOptions>(RENEWAL_PROVIDER_OPTIONS)

/** Token of the provider router. */
export const RENEWAL_PROVIDER: unique symbol = Symbol("integrations.renewal-provider.router")

/** Injects the provider router. Parameter type: RenewalProviderService. */
export const InjectRenewalProvider = (): TypedParameterDecorator<RenewalProviderService> =>
    injector<RenewalProviderService>(RENEWAL_PROVIDER)

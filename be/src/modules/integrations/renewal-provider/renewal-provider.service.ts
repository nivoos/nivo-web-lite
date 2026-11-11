import { Injectable } from "@nestjs/common"
import { ManualRenewalClient } from "./manual-renewal.client"
import { FixtureRenewalClient } from "./fixture-renewal.client"
import { InjectRenewalProviderOptions } from "./renewal-provider.decorators"
import type { RenewalProviderOptions } from "./renewal-provider.options"
import type { ProviderKey, RenewalProviderPlugin } from "./renewal-provider.port"

@Injectable()
/** Routes a service to the plugin of its provider; anything unrouted goes to `manual` (a person). */
export class RenewalProviderService {
    constructor(
        @InjectRenewalProviderOptions() private readonly options: RenewalProviderOptions,
        private readonly manual: ManualRenewalClient,
        private readonly fixture: FixtureRenewalClient,
    ) {}

    /** The plugin of a provider key. */
    pluginFor(provider: ProviderKey): RenewalProviderPlugin {
        const name = provider === null ? undefined : this.options.plugins[provider]
        return name === "fixture" ? this.fixture : this.manual
    }
}

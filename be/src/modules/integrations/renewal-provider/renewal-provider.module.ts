import { Module, type DynamicModule } from "@nestjs/common"
import { ManualRenewalClient } from "./manual-renewal.client"
import { FixtureRenewalClient } from "./fixture-renewal.client"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./renewal-provider.module-definition"
import { RENEWAL_PROVIDER } from "./renewal-provider.decorators"
import { RenewalProviderService } from "./renewal-provider.service"

@Module({})
/** The renewal provider port: its plugins and the router, registered once at the root. */
export class RenewalProviderModule extends ConfigurableModuleClass {
    /** Registers the port once in the app root. */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const base = super.register(options)
        return {
            ...base,
            providers: [
                ...(base.providers ?? []),
                ManualRenewalClient,
                FixtureRenewalClient,
                { provide: RENEWAL_PROVIDER, useClass: RenewalProviderService },
            ],
            exports: [RENEWAL_PROVIDER],
        }
    }
}

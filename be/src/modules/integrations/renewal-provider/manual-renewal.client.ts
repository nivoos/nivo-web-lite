import { Injectable } from "@nestjs/common"
import type {
    ProviderRenewRequest,
    ProviderRenewResult,
    ProviderServiceFacts,
    ProviderStatus,
    RenewalProviderPlugin,
} from "./renewal-provider.port"

@Injectable()
/** The `manual` plugin: a person checks and renews at the provider, then confirms in the CRM. It calls nothing. */
export class ManualRenewalClient implements RenewalProviderPlugin {
    /** The plugin's name. */
    readonly name = "manual" as const

    /** A person checks: the state is unknown to the CRM. */
    status(_facts: ProviderServiceFacts): Promise<ProviderStatus> {
        return Promise.resolve({
            plugin: "manual",
            state: "unknown",
            expiresOn: null,
            checkedBy: "person",
            note: "manual: a person checks at the provider",
        })
    }

    /** Records that a person must renew; the request waits for the person's confirmation. */
    renew(request: ProviderRenewRequest): Promise<ProviderRenewResult> {
        return Promise.resolve({
            plugin: "manual",
            state: "pending_person",
            providerRef: null,
            newExpiresOn: null,
            dryRun: request.dryRun,
        })
    }
}

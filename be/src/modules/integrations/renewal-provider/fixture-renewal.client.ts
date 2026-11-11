import { Injectable } from "@nestjs/common"
import { addMonths } from "@modules/platform/primitives"
import type {
    ProviderRenewRequest,
    ProviderRenewResult,
    ProviderServiceFacts,
    ProviderStatus,
    RenewalProviderPlugin,
} from "./renewal-provider.port"

/** The label every fixture answer carries. */
export const FIXTURE_NOTE = "fixture: answered from the CRM's own row; no provider was called"

/** The state the CRM's own end date implies on a day. */
const stateOf = (expiresOn: string | null, today: string): ProviderStatus["state"] => {
    if (expiresOn === null) return "unknown"
    return expiresOn >= today ? "active" : "expired"
}

@Injectable()
/**
 * The `fixture` plugin (stands for iNET and Tino until their live plugins exist, clearly labelled): answers from the CRM's own row and
 * NEVER calls out. Its renewal is reported `renewed` with a `FIXTURE-` reference and `dryRun: true`; the CRM does not move the
 * service's end date on a fixture answer.
 */
export class FixtureRenewalClient implements RenewalProviderPlugin {
    /** The plugin's name. */
    readonly name = "fixture" as const

    /** The state as the CRM's row implies it. */
    status(facts: ProviderServiceFacts): Promise<ProviderStatus> {
        return Promise.resolve({
            plugin: "fixture",
            state: stateOf(facts.expiresOn, facts.today),
            expiresOn: facts.expiresOn,
            checkedBy: "fixture",
            note: FIXTURE_NOTE,
        })
    }

    /** A fixture renewal: the end date moves by the term, from the later of the old end date and today. */
    renew(request: ProviderRenewRequest): Promise<ProviderRenewResult> {
        const from = request.expiresOn !== null && request.expiresOn > request.today ? request.expiresOn : request.today
        return Promise.resolve({
            plugin: "fixture",
            state: "renewed",
            providerRef: `FIXTURE-${request.renewalId.slice(0, 8).toUpperCase()}`,
            newExpiresOn: addMonths(from, request.termMonths),
            dryRun: true,
        })
    }
}

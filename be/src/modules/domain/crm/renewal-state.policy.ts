import { CrmError, CrmErrorCode } from "./errors/crm.error"
import type { RenewalOutcome, RenewalState } from "./renewal.contracts"

/** The states in which a request is open (counts as the service's one open request). */
export const OPEN_RENEWAL_STATES: ReadonlyArray<RenewalState> = ["awaiting_payment", "paid", "pending_person"]

/** Statuses of a service that refuse a renewal. */
export const NOT_RENEWABLE_STATUSES: ReadonlyArray<string> = ["cancelled", "internal", "private_hosting", "not_found"]

/** A payment may be recorded only while the request awaits it. */
export const assertPayable = (state: string): void => {
    if (state !== "awaiting_payment") throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state } })
}

/**
 * A provider outcome is recorded only for a paid request (pay first: owner decision 2026-11-12): `pending` only from `paid` (the
 * provider's answer is pending or unknown, a person follows up); `renewed` or `failed` from `paid` or from that wait.
 */
export const assertRecordable = (state: string, outcome: RenewalOutcome): void => {
    if (state === "awaiting_payment") throw new CrmError({ code: CrmErrorCode.RenewalNotPaid, params: { state } })
    const from: ReadonlyArray<string> = outcome === "pending" ? ["paid"] : ["paid", "pending_person"]
    if (!from.includes(state)) throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state } })
}

/** The state an outcome records. */
export const stateOfOutcome = (outcome: RenewalOutcome): RenewalState =>
    outcome === "pending" ? "pending_person" : outcome

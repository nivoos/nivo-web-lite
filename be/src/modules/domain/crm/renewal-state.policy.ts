import { CrmError, CrmErrorCode } from "./errors/crm.error"
import type { RenewalState } from "./renewal.contracts"

/** The states in which a request is open (counts as the service's one open request). */
export const OPEN_RENEWAL_STATES: ReadonlyArray<RenewalState> = ["awaiting_payment", "paid", "pending_person"]

/** Statuses of a service that refuse a renewal. */
export const NOT_RENEWABLE_STATUSES: ReadonlyArray<string> = ["cancelled", "internal", "private_hosting", "not_found"]

/** A payment may be recorded only while the request awaits it. */
export const assertPayable = (state: string): void => {
    if (state !== "awaiting_payment") throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state } })
}

/** The provider step runs only on a paid request (pay first: owner decision 2026-11-12). */
export const assertExecutable = (state: string): void => {
    if (state === "awaiting_payment") throw new CrmError({ code: CrmErrorCode.RenewalNotPaid, params: { state } })
    if (state !== "paid") throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state } })
}

/** A person's confirmation closes a request that waits for one. */
export const assertConfirmable = (state: string): void => {
    if (state !== "pending_person") throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state } })
}

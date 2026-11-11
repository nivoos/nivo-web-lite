import { canonicalJson, sha256Hex } from "@modules/platform/primitives"
import { CrmError, CrmErrorCode } from "./errors/crm.error"

/** The sha256 of a request's canonical JSON: what a replay key is bound to. */
export const requestHashOf = (request: unknown): string => sha256Hex(canonicalJson(request))

/**
 * Decides a keyed write against the row already stored under its key: `true` = replay (answer the stored row), `false` = new (no row);
 * a row stored with another request's hash is refused with CRM_IDEMPOTENCY_KEY_REUSED.
 */
export const isReplay = (stored: { readonly requestHash: string | null } | null, hash: string): boolean => {
    if (stored === null) return false
    if (stored.requestHash !== hash) throw new CrmError({ code: CrmErrorCode.IdempotencyKeyReused })
    return true
}

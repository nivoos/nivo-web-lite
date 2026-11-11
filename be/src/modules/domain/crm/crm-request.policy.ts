import { CrmError, CrmErrorCode } from "./errors/crm.error"

const REPLAY_KEY = /^[A-Za-z0-9._:-]{1,200}$/u

/** A request header as Node answers it. */
type HeaderValue = string | ReadonlyArray<string> | undefined

/** One header's single value. */
const single = (value: HeaderValue): string | undefined => (typeof value === "string" ? value : undefined)

/**
 * The workspace a CRM request acts for: the workspace of the service credential that authenticated it, and nothing the caller
 * sends (owner 2026-11-12: many workspaces, one CRM; one credential per workspace). No credential, no workspace: refused.
 */
export const workspaceOf = (credentialWorkspace: string | undefined): string => {
    if (credentialWorkspace === undefined) throw new CrmError({ code: CrmErrorCode.ServiceKeyRejected })
    return credentialWorkspace
}

/** The replay key of a keyed write: `[A-Za-z0-9._:-]{1,200}`; an absent or malformed one is refused as invalid. */
export const idempotencyKeyOf = (header: HeaderValue): string => {
    const value = single(header)
    if (value === undefined || !REPLAY_KEY.test(value)) throw new CrmError({ code: CrmErrorCode.IdempotencyKeyInvalid })
    return value
}

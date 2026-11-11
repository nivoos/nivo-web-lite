import { CrmError, CrmErrorCode } from "./errors/crm.error"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const REPLAY_KEY = /^[A-Za-z0-9._:-]{1,200}$/u

/** A request header as Node answers it. */
type HeaderValue = string | ReadonlyArray<string> | undefined

/** One header's single value. */
const single = (value: HeaderValue): string | undefined => (typeof value === "string" ? value : undefined)

/**
 * The workspace a CRM request acts for: the `X-Workspace-Id` uuid (lower case), which must equal the workspace the service key was
 * issued for (one credential, one workspace). A malformed header is refused as invalid, another workspace as forbidden.
 */
export const workspaceOf = (header: HeaderValue, credentialWorkspace: string | undefined): string => {
    const value = single(header)
    if (value === undefined || !UUID.test(value)) throw new CrmError({ code: CrmErrorCode.WorkspaceInvalid })
    if (credentialWorkspace === undefined) throw new CrmError({ code: CrmErrorCode.ServiceKeyRejected })
    const workspaceId = value.toLowerCase()
    if (workspaceId !== credentialWorkspace) throw new CrmError({ code: CrmErrorCode.WorkspaceForbidden })
    return workspaceId
}

/** The replay key of a keyed write: `[A-Za-z0-9._:-]{1,200}`; an absent or malformed one is refused as invalid. */
export const idempotencyKeyOf = (header: HeaderValue): string => {
    const value = single(header)
    if (value === undefined || !REPLAY_KEY.test(value)) throw new CrmError({ code: CrmErrorCode.IdempotencyKeyInvalid })
    return value
}

import type { EnvSource } from "@modules/platform/config"
import type { CrmOptions } from "./crm.options"
import { CrmError, CrmErrorCode } from "./errors/crm.error"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

/** Parses the CRM options; a missing key stops boot naming it, and the workspace must be a uuid (no default for either). */
export const parseCrmConfig = (env: EnvSource): CrmOptions => {
    const workspaceId = env.string("CRM_SERVICE_WORKSPACE_ID")
    if (!UUID.test(workspaceId))
        throw new CrmError({ code: CrmErrorCode.ConfigWorkspaceInvalid, params: { key: "CRM_SERVICE_WORKSPACE_ID" } })
    return { credential: { serviceKey: env.secret("CRM_SERVICE_KEY"), workspaceId: workspaceId.toLowerCase() } }
}

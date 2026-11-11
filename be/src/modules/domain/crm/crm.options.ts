import type { Secret } from "@modules/platform/config"

/** The service key NIVO's OpenAPI provider presents and the workspace it acts for. */
export interface CrmCredentialOptions {
    /** The sealed key NAMED `CRM_SERVICE_KEY` (mounted as `CRM_SERVICE_KEY_FILE`); compared in constant time, never logged. */
    readonly serviceKey: Secret
    /** The NIVO enterprise workspace the key acts for (`CRM_SERVICE_WORKSPACE_ID`, a uuid): one credential, one workspace. */
    readonly workspaceId: string
}

/** The options of the CRM capability: the API passes the credential; the cli, which serves no door, passes none. */
export interface CrmOptions {
    /** The service key and its workspace; absent, every credential door is refused. */
    readonly credential?: CrmCredentialOptions
}

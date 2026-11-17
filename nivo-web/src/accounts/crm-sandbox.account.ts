import { env, secret } from "@nivoos-lite/nivoos-sdk"
import type { ProviderAccount } from "@nivoos-lite/nivoos-sdk"
import { NivowebCrmProvider } from "../crm/nivoweb-crm.provider.cell.ts"

/**
 * `crm-sandbox`: the NIVO Web CRM of this repository, SANDBOX first: the CRM's dev instance (`npm run dev:be` or the dev stack of this repository, api port 3201, given to the deploy as `CRM_SANDBOX_URL`) filled with invented records, never real
 * customers. The service key of the sandbox workspace is read from `CRM_SANDBOX_SERVICE_KEY` of the secrets file (`cli credential issue --workspace <uuid> --label nivo-sandbox`). The production account
 * (`crm-main`) is added when the owner switches the agents over; until then every call a workflow makes lands in the sandbox.
 */
export class CrmSandbox implements ProviderAccount<typeof NivowebCrmProvider> {
    readonly key = "crm-sandbox"
    readonly provider = NivowebCrmProvider
    readonly title = { vi: "CRM NIVO Web (sandbox)", en: "NIVO Web CRM (sandbox)" }
    readonly fields = { baseUrl: env("CRM_SANDBOX_URL") }
    readonly secrets = { serviceKey: secret("CRM_SANDBOX_SERVICE_KEY") }
}

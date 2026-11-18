import type { Agent } from "@starci/nivoos-sdk"
import { CrmSandbox } from "../../accounts/crm-sandbox.account.ts"
import { ZaloMain } from "../../accounts/zalo-main.account.ts"
import { keyOf } from "../../package-key.ts"
import { Front } from "./front/front.workflow.ts"

/**
 * `nivo-web.webdesk`: the Support agent (Hỗ trợ), nested in the NIVO Web workspace: the front door of the company's Zalo OA. Slice 1 carries its primary workflow, the front door;
 * the incident (`webdesk.ticket`), the mailed tickets and the team chat follow with the CRM provider (PLAN.md). Every step runs `auto`, as nivo-web-core shipped it.
 */
export class Webdesk implements Agent {
    readonly key = keyOf("webdesk")
    readonly version = 7
    readonly title = { vi: "Hỗ trợ", en: "Support" }
    readonly workflows = [Front]
    readonly providers = [ZaloMain, CrmSandbox]
}

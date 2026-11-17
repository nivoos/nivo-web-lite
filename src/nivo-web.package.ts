// The entry of the nivo-web package: `nivoos package build src/nivo-web.package.ts --out seed` type-checks it and writes seed/nivo-web@<version>.json.
// One class per cell, per event kind, per brain document, per workspace, per agent and per workflow; the agents and their workflows are nested in the workspace
// class, so none needs an id. The channel providers (Zalo, SePay, mail, Telegram, Google) are the catalogue's (provider-templates): this package carries none.
import type { Package } from "@nivoos-lite/nivoos-sdk"
import { Answer } from "./agents/webdesk/front/answer.cell.ts"
import { ComplaintNotice } from "./agents/webdesk/front/complaint-notice.cell.ts"
import { ComplaintReply } from "./agents/webdesk/front/complaint-reply.cell.ts"
import { HandOff } from "./agents/webdesk/front/hand-off.cell.ts"
import { PostNotice } from "./agents/webdesk/front/post-notice.cell.ts"
import { SendLine } from "./agents/webdesk/front/send-line.cell.ts"
import { Understand } from "./agents/webdesk/front/understand.cell.ts"
import { FaultReported } from "./common/handoff/fault-reported.event.ts"
import { RenewalAsked } from "./common/handoff/renewal-asked.event.ts"
import { SalesAsked } from "./common/handoff/sales-asked.event.ts"
import { NivoWebWorkspace } from "./nivo-web.workspace.ts"
import { PACKAGE_KEY } from "./package-key.ts"

export default {
    package: { key: PACKAGE_KEY, version: "0.1.1", author: "nivoos-lite" },
    cells: [FaultReported, RenewalAsked, SalesAsked, Understand, HandOff, ComplaintReply, ComplaintNotice, PostNotice, Answer, SendLine],
    workspaces: [NivoWebWorkspace],
} satisfies Package

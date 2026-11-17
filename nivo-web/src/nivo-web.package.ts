// The entry of the nivo-web package: `nivoos package build src/nivo-web.package.ts --out seed` type-checks it and writes seed/nivo-web@<version>.json.
// One class per cell, per event kind, per brain document, per workspace, per agent and per workflow; the agents and their workflows are nested in the workspace
// class, so none needs an id. The channel providers (Zalo, SePay, mail, Telegram, Google) are the platform catalogue's (nivoos provider-templates); the business's own provider, `nivoweb-crm` (this repository's CRM service), is carried here.
import type { Package } from "@nivoos-lite/nivoos-sdk"
import { Answer } from "./agents/webdesk/front/answer.cell.ts"
import { ComplaintNotice } from "./agents/webdesk/front/complaint-notice.cell.ts"
import { ComplaintReply } from "./agents/webdesk/front/complaint-reply.cell.ts"
import { HandOff } from "./agents/webdesk/front/hand-off.cell.ts"
import { PostNotice } from "./agents/webdesk/front/post-notice.cell.ts"
import { SendLine } from "./agents/webdesk/front/send-line.cell.ts"
import { Understand } from "./agents/webdesk/front/understand.cell.ts"
import { CustomerContracts } from "./crm/customer-contracts.cell.ts"
import { CustomerFind } from "./crm/customer-find.cell.ts"
import { CustomerGet } from "./crm/customer-get.cell.ts"
import { CustomerServices } from "./crm/customer-services.cell.ts"
import { NivowebCrmProvider } from "./crm/nivoweb-crm.provider.cell.ts"
import { SummaryCounts } from "./crm/summary-counts.cell.ts"
import { TicketCreate } from "./crm/ticket-create.cell.ts"
import { TicketGet } from "./crm/ticket-get.cell.ts"
import { TicketList } from "./crm/ticket-list.cell.ts"
import { TicketUpdate } from "./crm/ticket-update.cell.ts"
import { FaultReported } from "./common/handoff/fault-reported.event.ts"
import { RenewalAsked } from "./common/handoff/renewal-asked.event.ts"
import { SalesAsked } from "./common/handoff/sales-asked.event.ts"
import { NivoWebWorkspace } from "./nivo-web.workspace.ts"
import { PACKAGE_KEY } from "./package-key.ts"

export default {
    package: { key: PACKAGE_KEY, version: "0.2.0", author: "nivo-web-lite" },
    // The CRM provider of this repository (the provider class, then its operations), then the agents' cells.
    cells: [
        NivowebCrmProvider,
        SummaryCounts,
        CustomerFind,
        CustomerGet,
        CustomerServices,
        CustomerContracts,
        TicketCreate,
        TicketGet,
        TicketList,
        TicketUpdate,
        FaultReported,
        RenewalAsked,
        SalesAsked,
        Understand,
        HandOff,
        ComplaintReply,
        ComplaintNotice,
        PostNotice,
        Answer,
        SendLine,
    ],
    workspaces: [NivoWebWorkspace],
} satisfies Package

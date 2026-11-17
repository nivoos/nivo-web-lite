import type { Workspace } from "@nivoos-lite/nivoos-sdk"
import { Webdesk } from "./agents/webdesk/webdesk.agent.ts"
import { NIVO_WEB_BRAIN } from "./brain/nivo-web.brain.ts"
import { keyOf } from "./package-key.ts"

/**
 * `nivo-web.company`: the NIVO Web workspace (domains, hosting, website design and care for small companies). A deploy finds or makes it under its derived id (the deployer becomes its
 * owner), installs its agents and syncs the brain documents.
 */
export class NivoWebWorkspace implements Workspace {
    readonly key = keyOf("company")
    readonly title = { vi: "NIVO Web", en: "NIVO Web" }
    readonly agents = [Webdesk]
    readonly brain = NIVO_WEB_BRAIN
}

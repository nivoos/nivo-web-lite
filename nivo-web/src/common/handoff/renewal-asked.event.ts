import type { EventKind } from "@nivoos-lite/nivoos-sdk"
import { keyOf } from "../../package-key.ts"
import { HandOffData } from "./handoff-data.ts"

/** `nivo-web.renewal.asked`: the customer writes about renewing, paying for or stopping a service they hold; the Renewal agent's answer workflow takes it. */
export class RenewalAsked implements EventKind<typeof HandOffData> {
    readonly key = keyOf("renewal.asked")
    readonly version = 1
    readonly title = { vi: "Khách hỏi gia hạn", en: "Renewal asked" }
    readonly event = HandOffData
    readonly subjectKind = "person"
    readonly vias = ["internal"] as const
}

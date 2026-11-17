import type { EventKind } from "@nivoos-lite/nivoos-sdk"
import { keyOf } from "../../package-key.ts"
import { HandOffData } from "./handoff-data.ts"

/** `nivo-web.sales.asked`: the customer wants something new from the company; the Sales agent's enquiry workflow takes it. */
export class SalesAsked implements EventKind<typeof HandOffData> {
    readonly key = keyOf("sales.asked")
    readonly version = 1
    readonly title = { vi: "Khách hỏi mua mới", en: "Sales enquiry" }
    readonly event = HandOffData
    readonly subjectKind = "person"
    readonly vias = ["internal"] as const
}

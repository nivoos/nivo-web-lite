import type { EventKind } from "@starci/nivoos-sdk"
import { keyOf } from "../../package-key.ts"
import { HandOffData } from "./handoff-data.ts"

/** `nivo-web.fault.reported`: the customer reports a fault; the Support agent's incident workflow takes it. */
export class FaultReported implements EventKind<typeof HandOffData> {
    readonly key = keyOf("fault.reported")
    readonly version = 1
    readonly title = { vi: "Khách báo lỗi", en: "Fault reported" }
    readonly event = HandOffData
    readonly subjectKind = "person"
    readonly vias = ["internal"] as const
}

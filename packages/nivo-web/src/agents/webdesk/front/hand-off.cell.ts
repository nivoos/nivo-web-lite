import { z } from "zod"
import type { Node, NodeReach } from "@nivoos-lite/nivoos-sdk"
import { MessageEvent } from "@nivoos-lite/provider-templates/src/zalo/message-received.cell.ts"
import type { FaultReported } from "../../../common/handoff/fault-reported.event.ts"
import type { RenewalAsked } from "../../../common/handoff/renewal-asked.event.ts"
import type { SalesAsked } from "../../../common/handoff/sales-asked.event.ts"
import { keyOf } from "../../../package-key.ts"
import { FrontBranch } from "./understand.cell.ts"

export const HandOffInput = z.strictObject({
    branch: FrontBranch,
    summary: z.string().min(1).max(600),
    messages: z.array(MessageEvent).min(1).max(50),
})
export const HandOffOutput = z.strictObject({ branch: FrontBranch, eventKey: z.string() })

type In = z.infer<typeof HandOffInput>
type Out = z.infer<typeof HandOffOutput>

/** The words of the burst, one message per line (a picture or a file has none). */
const textOf = (input: In): string => input.messages.map((message) => message.text).join("\n").slice(0, 8000)

/**
 * `nivo-web.webdesk-hand-off` (Chuyển việc): one act, `events.emit` of the hand-off kind of the route on the person's subject, keyed by the last message so a rerun writes nothing new.
 * Fault goes to the Support agent's incident, renewal to the Renewal agent's answer, sales to the Sales agent's enquiry (nivo-web-core's three `callWorkflow` hand-offs). No `link`:
 * the front door ends and the callee carries the conversation on.
 */
export class HandOff implements Node<typeof HandOffInput, typeof HandOffOutput> {
    readonly key = keyOf("webdesk-hand-off")
    readonly version = 1
    readonly title = { vi: "Chuyển việc", en: "Hand the work on" }
    readonly input = HandOffInput
    readonly output = HandOffOutput
    readonly reads = []
    readonly mutation = "events.emit"

    run(input: In, reach: NodeReach): Out {
        const last = input.messages[input.messages.length - 1]
        if (last === undefined) throw new Error("hand_off_without_messages")
        const data = { channel: "zalo", userId: last.userId, msgId: last.msgId, text: textOf(input), summary: input.summary }
        const subject = { kind: "person", id: last.userId }
        const key = `front:${last.msgId}`
        if (input.branch === "fault") {
            const { error } = reach.emit<typeof FaultReported>("nivo-web.fault.reported", { subject, data, key })
            if (error) throw error
        } else if (input.branch === "renewal") {
            const { error } = reach.emit<typeof RenewalAsked>("nivo-web.renewal.asked", { subject, data, key })
            if (error) throw error
        } else if (input.branch === "sales") {
            const { error } = reach.emit<typeof SalesAsked>("nivo-web.sales.asked", { subject, data, key })
            if (error) throw error
        } else throw new Error(`not_a_hand_off: ${input.branch}`)
        return { branch: input.branch, eventKey: key }
    }
}

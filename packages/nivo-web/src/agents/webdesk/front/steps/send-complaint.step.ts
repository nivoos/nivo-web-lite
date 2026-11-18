import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { SendLine } from "../send-line.cell.ts"
import type { State } from "../front.workflow.ts"
import { ComplaintNotice } from "./complaint-notice.step.ts"
import { Declined } from "./declined.step.ts"

/** Step `send-complaint` of the front door: the apology is sent on the channel. */
export class SendComplaint extends NodeRun(SendLine)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ to: s.messages[0].userId, text: s.complaint.reply })
    override readonly into = ["sent"] as const
    override readonly next = ComplaintNotice
    override readonly onRefused = { route_held: Declined, contact_erased: Declined }
}

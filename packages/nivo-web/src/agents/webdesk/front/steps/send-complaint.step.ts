import { NodeRun, type StateView } from "@nivoos-lite/nivoos-sdk"
import { SendLine } from "../send-line.cell.ts"
import type { State } from "../front.workflow.ts"
import { ComplaintSent } from "./complaint-sent.step.ts"

export class SendComplaint extends NodeRun(SendLine)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ to: s.messages[0].userId, text: s.complaint.reply })
    override readonly into = ["sent"] as const
    override readonly next = ComplaintSent
}

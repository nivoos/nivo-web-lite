import { NodeRun, type StateView } from "@nivoos-lite/nivoos-sdk"
import { ComplaintReply as ComplaintReplyCell } from "../complaint-reply.cell.ts"
import type { State } from "../front.workflow.ts"
import { SendComplaint } from "./send-complaint.step.ts"

export class ComplaintReply extends NodeRun(ComplaintReplyCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ messages: s.messages, summary: s.understood.summary })
    override readonly into = ["complaint"] as const
    override readonly next = SendComplaint
}

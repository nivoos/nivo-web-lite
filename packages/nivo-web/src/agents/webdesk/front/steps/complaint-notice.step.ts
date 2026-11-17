import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { ComplaintNotice as ComplaintNoticeCell } from "../complaint-notice.cell.ts"
import type { State } from "../front.workflow.ts"
import { PostNotice } from "./post-notice.step.ts"

/** Step `complaint-notice` of the front door: the team is told of the complaint. */
export class ComplaintNotice extends NodeRun(ComplaintNoticeCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({
        messages: s.messages,
        summary: s.complaint.summary,
        reference: s.complaint.reference,
    })
    override readonly into = ["notice"] as const
    override readonly next = PostNotice
}

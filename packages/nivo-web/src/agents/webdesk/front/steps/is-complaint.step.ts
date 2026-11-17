import { NodeIf, type StateView } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { Answer } from "./answer.step.ts"
import { ComplaintReply } from "./complaint-reply.step.ts"

/** Step `is-complaint` of the front door: the branch on whether the customer complains. */
export class IsComplaint extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) => s.understood.branch === "complaint"
    override readonly yes = ComplaintReply
    override readonly no = Answer
    override readonly label = { vi: "Khách khiếu nại?", en: "A complaint?" }
}

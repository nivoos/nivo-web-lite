import { NodeIf, type StateView } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { Answered } from "./answered.step.ts"
import { Declined } from "./declined.step.ts"

/** Step `answer-sent` of the front door: the branch on whether the answer left on the channel. */
export class AnswerSent extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) => s.sent.sent === true
    override readonly yes = Answered
    override readonly no = Declined
    override readonly label = { vi: "Đã gửi câu trả lời?", en: "Answer sent?" }
}

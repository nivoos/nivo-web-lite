import { NodeIf, type StateView } from "@nivoos-lite/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { Answered } from "./answered.step.ts"
import { Declined } from "./declined.step.ts"

export class AnswerSent extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) => s.sent.sent === true
    override readonly yes = Answered
    override readonly no = Declined
    override readonly label = { vi: "Đã gửi câu trả lời?", en: "Answer sent?" }
}

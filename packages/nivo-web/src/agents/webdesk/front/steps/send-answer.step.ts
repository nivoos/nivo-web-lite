import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { SendLine } from "../send-line.cell.ts"
import type { State } from "../front.workflow.ts"
import { AnswerSent } from "./answer-sent.step.ts"

/** Step `send-answer` of the front door: the answer is sent on the channel. */
export class SendAnswer extends NodeRun(SendLine)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ to: s.messages[0].userId, text: s.answer.reply })
    override readonly into = ["sent"] as const
    override readonly next = AnswerSent
}

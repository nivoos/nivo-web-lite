import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { Answer as AnswerCell } from "../answer.cell.ts"
import type { State } from "../front.workflow.ts"
import { SendAnswer } from "./send-answer.step.ts"

/** Step `answer` of the front door: the model answers from the brain. */
export class Answer extends NodeRun(AnswerCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ messages: s.messages, summary: s.understood.summary })
    override readonly into = ["answer"] as const
    override readonly next = SendAnswer
}

import { fromSetting, NodeWait, RoomAnswered, type RoomAnsweredItem, take } from "@starci/nivoos-sdk"
import { AskPerson } from "../ask-person.cell.ts"
import type { State } from "../front.workflow.ts"
import { HoldingReply } from "./holding-reply.step.ts"
import { SendAnswer } from "./send-answer.step.ts"

/**
 * Step `wait-person` of the front door: the run waits for the person's typed reply, which becomes the answer; the send to the customer is the next, approved step. When nobody answers within
 * the `answerMinutes` setting of `ask-person` (30 by default) the customer gets a holding line first.
 */
export class WaitPerson extends NodeWait<typeof State> {
    override readonly take = [
        take<typeof State>(RoomAnswered, {}, (s, answers: Array<RoomAnsweredItem>) => {
            for (const answer of answers) {
                if (answer.text !== undefined && answer.text.trim() !== "")
                    s.answer = { answered: true, reply: answer.text.trim(), question: "" }
            }
        }),
    ]
    override readonly timeout = fromSetting(AskPerson, "answerMinutes", "minutes")
    override readonly onTimeout = HoldingReply
    override readonly next = SendAnswer
}

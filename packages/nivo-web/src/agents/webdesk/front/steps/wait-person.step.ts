import { NodeWait, RoomAnswered, type RoomAnsweredItem, take } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { SendAnswer } from "./send-answer.step.ts"

/** Step `wait-person` of the front door: the run waits for the person's typed reply, which becomes the answer; the send to the customer is the next, approved step. */
export class WaitPerson extends NodeWait<typeof State> {
    override readonly take = [
        take<typeof State>(RoomAnswered, {}, (s, answers: Array<RoomAnsweredItem>) => {
            for (const answer of answers) {
                if (answer.text !== undefined && answer.text.trim() !== "")
                    s.answer = { answered: true, reply: answer.text.trim(), question: "" }
            }
        }),
    ]
    override readonly next = SendAnswer
}

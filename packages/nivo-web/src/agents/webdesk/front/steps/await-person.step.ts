import { NodeWait, RoomAnswered, type RoomAnsweredItem, take } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { SendAnswer } from "./send-answer.step.ts"

/** Step `await-person` of the front door: after the holding line the run waits for the person's typed reply with no further deadline (one holding line per question, never one every half hour). */
export class AwaitPerson extends NodeWait<typeof State> {
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

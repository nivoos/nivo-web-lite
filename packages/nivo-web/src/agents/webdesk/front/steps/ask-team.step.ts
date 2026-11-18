import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { AskPerson } from "../ask-person.cell.ts"
import type { State } from "../front.workflow.ts"
import { WaitPerson } from "./wait-person.step.ts"

/** Step `ask-team` of the front door: the brain does not answer, so the question goes to the person in charge as a card with a box for the reply. */
export class AskTeam extends NodeRun(AskPerson)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ question: s.answer.question })
    override readonly into = ["asked"] as const
    override readonly next = WaitPerson
}

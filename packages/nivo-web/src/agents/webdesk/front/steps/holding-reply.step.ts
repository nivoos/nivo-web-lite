import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { SendLine } from "../send-line.cell.ts"
import type { State } from "../front.workflow.ts"
import { AwaitPerson } from "./await-person.step.ts"

/** Step `holding-reply` of the front door: nobody answered in time, so the customer gets the short holding line (the same approved send); the run then keeps waiting for the person. */
export class HoldingReply extends NodeRun(SendLine)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ to: s.messages[0].userId, text: s.asked.holding })
    override readonly into = ["sent"] as const
    override readonly next = AwaitPerson
}

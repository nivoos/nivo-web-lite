import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { Understand as UnderstandCell } from "../understand.cell.ts"
import type { State } from "../front.workflow.ts"
import { NeedsHandOff } from "./needs-hand-off.step.ts"

/** Step `understand` of the front door: the model reads what the customer wants now. */
export class Understand extends NodeRun(UnderstandCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ messages: s.messages })
    override readonly into = ["understood"] as const
    override readonly next = NeedsHandOff
}

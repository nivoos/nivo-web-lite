import { NodeRun, type StateView } from "@nivoos-lite/nivoos-sdk"
import { Understand as UnderstandCell } from "../understand.cell.ts"
import type { State } from "../front.workflow.ts"
import { NeedsHandOff } from "./needs-hand-off.step.ts"

export class Understand extends NodeRun(UnderstandCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ messages: s.messages })
    override readonly into = ["understood"] as const
    override readonly next = NeedsHandOff
}

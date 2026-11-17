import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { HandOff as HandOffCell } from "../hand-off.cell.ts"
import type { State } from "../front.workflow.ts"
import { Handed } from "./handed.step.ts"

/** Step `hand-off` of the front door: the request is handed on to its agent. */
export class HandOff extends NodeRun(HandOffCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({
        branch: s.understood.branch,
        summary: s.understood.summary,
        messages: s.messages,
    })
    override readonly into = ["handed"] as const
    override readonly next = Handed
}

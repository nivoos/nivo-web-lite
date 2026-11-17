import { NodeEnd } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"

/** Step `answered` of the front door: the end of a run answered from the brain. */
export class Answered extends NodeEnd<typeof State> {
    override readonly reason = "answered"
}

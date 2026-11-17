import { NodeEnd } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"

/** The work went on to the workflow of its route. */
export class Handed extends NodeEnd<typeof State> {
    override readonly reason = "handed"
}

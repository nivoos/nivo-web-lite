import { NodeEnd } from "@nivoos-lite/nivoos-sdk"
import type { State } from "../front.workflow.ts"

/** The channel refused the send (a member holds the route, or the contact was erased): nothing went out. */
export class Declined extends NodeEnd<typeof State> {
    override readonly reason = "declined"
}

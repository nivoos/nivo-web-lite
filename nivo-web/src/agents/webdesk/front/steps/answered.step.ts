import { NodeEnd } from "@nivoos-lite/nivoos-sdk"
import type { State } from "../front.workflow.ts"

export class Answered extends NodeEnd<typeof State> {
    override readonly reason = "answered"
}

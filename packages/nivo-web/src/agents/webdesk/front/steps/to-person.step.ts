import { NodeEnd } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"

/** The complaint is with a person now (nivo-web-core's outcome `person`). */
export class ToPerson extends NodeEnd<typeof State> {
    override readonly reason = "person"
}

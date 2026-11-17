import { NodeIf, type StateView } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { HandOff } from "./hand-off.step.ts"
import { IsComplaint } from "./is-complaint.step.ts"

/** A fault, a renewal or something new to buy is the work of another workflow. */
export class NeedsHandOff extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) =>
        s.understood.branch === "fault" || s.understood.branch === "renewal" || s.understood.branch === "sales"
    override readonly yes = HandOff
    override readonly no = IsComplaint
    override readonly label = { vi: "Chuyển cho quy trình khác?", en: "Work for another workflow?" }
}

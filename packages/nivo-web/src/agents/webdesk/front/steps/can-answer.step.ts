import { NodeIf, type StateView } from "@starci/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { AskTeam } from "./ask-team.step.ts"
import { SendAnswer } from "./send-answer.step.ts"

/** Step `can-answer` of the front door: the branch on whether the brain answered (a reply to send) or a person must (the owner's question). */
export class CanAnswer extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) => s.answer.answered === true
    override readonly yes = SendAnswer
    override readonly no = AskTeam
    override readonly label = { vi: "Thông tin công khai trả lời được?", en: "Public information answers?" }
}

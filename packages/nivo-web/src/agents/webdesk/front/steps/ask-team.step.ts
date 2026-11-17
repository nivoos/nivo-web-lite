import { NodeRun, type StateView } from "@starci/nivoos-sdk"
import { PostNotice as PostNoticeCell } from "../post-notice.cell.ts"
import type { State } from "../front.workflow.ts"
import { ToPerson } from "./to-person.step.ts"

/** Step `ask-team` of the front door: the brain does not answer, so the owner's question is posted to the team room and the run ends with a person. */
export class AskTeam extends NodeRun(PostNoticeCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({
        title: "Cần người trả lời khách",
        text: s.answer.question,
    })
    override readonly into = ["posted"] as const
    override readonly next = ToPerson
}

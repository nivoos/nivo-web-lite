import { NodeRun, type StateView } from "@nivoos-lite/nivoos-sdk"
import { PostNotice as PostNoticeCell } from "../post-notice.cell.ts"
import type { State } from "../front.workflow.ts"
import { ToPerson } from "./to-person.step.ts"

export class PostNotice extends NodeRun(PostNoticeCell)<typeof State> {
    override readonly input = (s: StateView<typeof State>) => ({ title: s.notice.title, text: s.notice.text })
    override readonly into = ["posted"] as const
    override readonly next = ToPerson
}

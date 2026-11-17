import { NodeIf, type StateView } from "@nivoos-lite/nivoos-sdk"
import type { State } from "../front.workflow.ts"
import { ComplaintNotice } from "./complaint-notice.step.ts"
import { Declined } from "./declined.step.ts"

export class ComplaintSent extends NodeIf<typeof State> {
    override readonly when = (s: StateView<typeof State>) => s.sent.sent === true
    override readonly yes = ComplaintNotice
    override readonly no = Declined
    override readonly label = { vi: "Đã gửi lời xin lỗi?", en: "Apology sent?" }
}

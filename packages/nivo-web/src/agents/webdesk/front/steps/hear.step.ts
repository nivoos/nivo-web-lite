import { NodeWait, take } from "@nivoos-lite/nivoos-sdk"
import { ZaloMessageReceived } from "@nivoos-lite/provider-templates/src/zalo/message-received.cell.ts"
import { ZaloMain } from "../../../../accounts/zalo-main.account.ts"
import type { Message, State } from "../front.workflow.ts"
import { Understand } from "./understand.step.ts"

/** The start: a customer's message to the company's Zalo OA opens the run; messages that arrived together are read together. */
export class Hear extends NodeWait<typeof State> {
    override readonly take = [
        take<typeof State>(ZaloMessageReceived, { account: ZaloMain }, (s, messages: Message[]) => { messages.forEach((message) => s.messages.push(message)) }),
    ]
    override readonly next = Understand
}

import { NodeWait, take } from "@starci/nivoos-sdk"
import { ZaloMessageReceived } from "@starci/nivoos-provider-templates/zalo/message-received.cell"
import { ZaloMain } from "../../../../accounts/zalo-main.account.ts"
import type { Message, State } from "../front.workflow.ts"
import { Understand } from "./understand.step.ts"

/** The start: a customer's message to the company's Zalo OA opens the run; messages that arrived together are read together. */
export class Hear extends NodeWait<typeof State> {
    override readonly take = [
        take<typeof State>(ZaloMessageReceived, { account: ZaloMain }, (s, messages: Array<Message>) => {
            messages.forEach((message) => s.messages.push(message))
        }),
    ]
    override readonly next = Understand
}

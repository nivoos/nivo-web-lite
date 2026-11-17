import { z } from "zod"
import type { ContactMessageSend, Node, NodeReach } from "@nivoos-lite/nivoos-sdk"
import { keyOf } from "../../../package-key.ts"

export const SendLineInput = z.strictObject({ to: z.string().min(1).max(200), text: z.string().min(1).max(2000) })
/** `sent` false: a member holds the route (took the conversation over) or the contact was erased; nothing went out. */
export const SendLineOutput = z.strictObject({ sent: z.boolean(), refusal: z.string().max(60).nullable() })

type In = z.infer<typeof SendLineInput>
type Out = z.infer<typeof SendLineOutput>

/**
 * `nivo-web.send-line` (Gửi tin cho khách): one act, `contact_message.send` on the Zalo OA to the person who wrote. A held route or an erased contact is a declared refusal: the
 * node says why nothing went out and the workflow ends `declined` (nivo-web-core: a send the channel refused ended the run declined). Any other failure stops the run here for a person.
 */
export class SendLine implements Node<typeof SendLineInput, typeof SendLineOutput> {
    readonly key = keyOf("send-line")
    readonly version = 2
    readonly title = { vi: "Gửi tin cho khách", en: "Send the customer a line" }
    readonly input = SendLineInput
    readonly output = SendLineOutput
    readonly reads = []
    readonly mutation = "contact_message.send"

    run(input: In, reach: NodeReach): Out {
        const { error } = reach.call<ContactMessageSend>("contact_message.send", {
            provider: "zalo",
            to: input.to,
            text: input.text,
        })
        if (error) return { sent: false, refusal: error.code }
        return { sent: true, refusal: null }
    }
}

import { z } from "zod"
import type { ContactMessageSend, Node, NodeReach } from "@starci/nivoos-sdk"
import { keyOf } from "../../../package-key.ts"

export const SendLineInput = z.strictObject({ to: z.string().min(1).max(200), text: z.string().min(1).max(2000) })
/** The line went out (a held route or an erased contact is a declared refusal the step routes, so there is no `sent: false`). */
export const SendLineOutput = z.strictObject({ sent: z.literal(true) })

type In = z.infer<typeof SendLineInput>
type Out = z.infer<typeof SendLineOutput>

/**
 * `nivo-web.send-line` (Gửi tin cho khách): one act, `contact_message.send` on the Zalo OA to the person who wrote. A held route (`route_held`) or an erased contact (`contact_erased`) is a declared refusal the node hands up (`if (error) throw error`): the step routes it with `onRefused` and the workflow ends `declined`. Any other failure stops the run here for a person.
 */
export class SendLine implements Node<typeof SendLineInput, typeof SendLineOutput> {
    readonly key = keyOf("send-line")
    readonly version = 3
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
        if (error) throw error
        return { sent: true }
    }
}

import { z } from "zod"
import type { Node, NodeReach, RoomMessagePost } from "@starci/nivoos-sdk"
import { keyOf } from "../../../package-key.ts"

export const AskPersonInput = z.strictObject({ question: z.string().min(1).max(600) })
export const AskPersonOutput = z.strictObject({ asked: z.literal(true), messageId: z.string().max(200) })

type In = z.infer<typeof AskPersonInput>
type Out = z.infer<typeof AskPersonOutput>

/** The most characters of the typed reply (the Zalo line the customer gets is shorter than this). */
const REPLY_MAX = 2000

/**
 * `nivo-web.ask-person` (Hỏi người phụ trách): one act, `room.message.post` of a card with the question the public information could not answer and a box to type the reply. The run waits
 * for the typed answer (`engine.room.answered`); the send to the customer stays the approved, ask-locked step.
 */
export class AskPerson implements Node<typeof AskPersonInput, typeof AskPersonOutput> {
    readonly key = keyOf("ask-person")
    readonly version = 1
    readonly title = { vi: "Hỏi người phụ trách", en: "Ask the person in charge" }
    readonly input = AskPersonInput
    readonly output = AskPersonOutput
    readonly reads = []
    readonly mutation = "room.message.post"

    run(input: In, reach: NodeReach): Out {
        const { result } = reach.call<RoomMessagePost>("room.message.post", {
            text: `Cần người trả lời khách: ${input.question}`,
            input: { max: REPLY_MAX, placeholder: "Nhập câu trả lời gửi khách" },
        })
        return { asked: true, messageId: result.messageId }
    }
}

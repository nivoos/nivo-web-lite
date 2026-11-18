import { z } from "zod"
import type { Node, NodeReach, RoomMessagePost } from "@starci/nivoos-sdk"
import { keyOf } from "../../../package-key.ts"

export const AskPersonInput = z.strictObject({ question: z.string().min(1).max(600) })
export const AskPersonOutput = z.strictObject({
    asked: z.literal(true),
    messageId: z.string().max(200),
    /** The short line the customer gets when nobody answers in time (the workspace's template). */
    holding: z.string().min(1).max(300),
})
/** How long the run waits for the person before the customer gets a holding line, and the words of that line. A workspace may change both in the console. */
export const AskPersonSettings = z.strictObject({
    answerMinutes: z.number().int().min(1).max(10080).default(30),
    holdingReply: z.string().min(1).max(300).default("Dạ em đã chuyển câu hỏi cho nhân viên, anh/chị chờ chút ạ"),
})

type In = z.infer<typeof AskPersonInput>
type Out = z.infer<typeof AskPersonOutput>
type Settings = z.infer<typeof AskPersonSettings>

/** The most characters of the typed reply (the Zalo line the customer gets is shorter than this). */
const REPLY_MAX = 2000

/**
 * `nivo-web.ask-person` (Hỏi người phụ trách): one act, `room.message.post` of a card with the question the public information could not answer and a box to type the reply. The run waits
 * for the typed answer (`engine.room.answered`); the send to the customer stays the approved, ask-locked step.
 */
export class AskPerson implements Node<typeof AskPersonInput, typeof AskPersonOutput, typeof AskPersonSettings> {
    readonly key = keyOf("ask-person")
    readonly version = 1
    readonly title = { vi: "Hỏi người phụ trách", en: "Ask the person in charge" }
    readonly input = AskPersonInput
    readonly output = AskPersonOutput
    readonly settings = AskPersonSettings
    readonly reads = []
    readonly mutation = "room.message.post"

    run(input: In, reach: NodeReach<Settings>): Out {
        const { result } = reach.call<RoomMessagePost>("room.message.post", {
            text: `Cần người trả lời khách: ${input.question}`,
            input: { max: REPLY_MAX, placeholder: "Nhập câu trả lời gửi khách" },
        })
        return { asked: true, messageId: result.messageId, holding: reach.settings.holdingReply }
    }
}

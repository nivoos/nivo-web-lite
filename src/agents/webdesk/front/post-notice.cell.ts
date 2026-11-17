import { z } from "zod"
import type { Node, NodeReach, RoomMessagePost } from "@nivoos-lite/nivoos-sdk"
import { keyOf } from "../../../package-key.ts"

export const PostNoticeInput = z.strictObject({ title: z.string().min(1).max(200), text: z.string().min(1).max(2000) })
export const PostNoticeOutput = z.strictObject({ posted: z.literal(true), messageId: z.string() })

type In = z.infer<typeof PostNoticeInput>
type Out = z.infer<typeof PostNoticeOutput>

/** `nivo-web.post-notice` (Báo đội): one act, `room.message.post` of the heading and the words to the agent's team room. */
export class PostNotice implements Node<typeof PostNoticeInput, typeof PostNoticeOutput> {
    readonly key = keyOf("post-notice")
    readonly version = 1
    readonly title = { vi: "Báo đội", en: "Tell the team" }
    readonly input = PostNoticeInput
    readonly output = PostNoticeOutput
    readonly reads = []
    readonly mutation = "room.message.post"

    run(input: In, reach: NodeReach): Out {
        const { result } = reach.call<RoomMessagePost>("room.message.post", { text: `${input.title}\n${input.text}` })
        return { posted: true, messageId: result.messageId }
    }
}

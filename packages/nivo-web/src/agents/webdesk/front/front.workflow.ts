import { z } from "zod"
import type { Workflow } from "@starci/nivoos-sdk"
import { MessageEvent } from "@starci/nivoos-provider-templates/zalo/message-received.cell"
import { keyOf } from "../../../package-key.ts"
import { AnswerOutput } from "./answer.cell.ts"
import { AskPersonOutput } from "./ask-person.cell.ts"
import { ComplaintNoticeOutput } from "./complaint-notice.cell.ts"
import { ComplaintReplyOutput } from "./complaint-reply.cell.ts"
import { HandOffOutput } from "./hand-off.cell.ts"
import { PostNoticeOutput } from "./post-notice.cell.ts"
import { SendLineOutput } from "./send-line.cell.ts"
import { UnderstandOutput } from "./understand.cell.ts"
import { Answer } from "./steps/answer.step.ts"
import { AnswerSent } from "./steps/answer-sent.step.ts"
import { Answered } from "./steps/answered.step.ts"
import { AskTeam } from "./steps/ask-team.step.ts"
import { CanAnswer } from "./steps/can-answer.step.ts"
import { ComplaintNotice } from "./steps/complaint-notice.step.ts"
import { ComplaintReply } from "./steps/complaint-reply.step.ts"
import { ComplaintSent } from "./steps/complaint-sent.step.ts"
import { Declined } from "./steps/declined.step.ts"
import { HandOff } from "./steps/hand-off.step.ts"
import { Handed } from "./steps/handed.step.ts"
import { Hear } from "./steps/hear.step.ts"
import { IsComplaint } from "./steps/is-complaint.step.ts"
import { NeedsHandOff } from "./steps/needs-hand-off.step.ts"
import { PostNotice } from "./steps/post-notice.step.ts"
import { SendAnswer } from "./steps/send-answer.step.ts"
import { SendComplaint } from "./steps/send-complaint.step.ts"
import { ToPerson } from "./steps/to-person.step.ts"
import { Understand } from "./steps/understand.step.ts"
import { WaitPerson } from "./steps/wait-person.step.ts"

/** The one state object of a run: the customer's messages that opened it (appended), the decision, and what each route did. */
export const State = z.strictObject({
    messages: z.array(MessageEvent).max(50).optional(),
    understood: UnderstandOutput.optional(),
    handed: HandOffOutput.optional(),
    answer: AnswerOutput.optional(),
    complaint: ComplaintReplyOutput.optional(),
    notice: ComplaintNoticeOutput.optional(),
    sent: SendLineOutput.optional(),
    posted: PostNoticeOutput.optional(),
    asked: AskPersonOutput.optional(),
})
/** One customer message of the burst the front door hears (the Zalo message event). */
export type Message = z.infer<typeof MessageEvent>

/**
 * `nivo-web.webdesk-front` (Tiếp nhận tin khách): the Support agent's front door, nivo-web-core's `webdesk.front` v13. A customer's Zalo message to the company's OA opens it; the front
 * door understands what the customer wants NOW and routes it: a fault, a renewal or something new to buy is handed on (the Support agent's incident, the Renewal agent's answer, the
 * Sales agent's enquiry); a complaint is apologised for and told to the team (`person`); anything else is answered from the company's public information (`answered`). A send the
 * channel refuses (a member holds the route) ends `declined`; a question the brain does not answer goes to the person in charge as a card with a reply box; the run waits for the typed reply and sends it through the approved send.
 */
export class Front implements Workflow<typeof State> {
    readonly key = keyOf("webdesk-front")
    readonly version = 4
    readonly title = { vi: "Tiếp nhận tin khách", en: "Take a customer's message" }
    readonly state = State
    readonly append = ["messages"] as const
    readonly start = Hear
    /** Version 4 carries the live runs of versions 1, 2 and 3 over unchanged: the state is the same, a run parked at the first wait continues at it. */
    readonly upgrade = { from: [1, 2, 3], state: (old: never) => old, steps: [[Hear, Hear]] } as const
    readonly steps = [
        Hear,
        Understand,
        NeedsHandOff,
        HandOff,
        Handed,
        IsComplaint,
        ComplaintReply,
        SendComplaint,
        ComplaintSent,
        ComplaintNotice,
        PostNotice,
        ToPerson,
        Answer,
        CanAnswer,
        AskTeam,
        WaitPerson,
        SendAnswer,
        AnswerSent,
        Answered,
        Declined,
    ]
}

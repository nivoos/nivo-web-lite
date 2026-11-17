// The hand-offs of the front door: each is an author event kind on the customer's subject `person:<userId>` (the Zalo person), taken by the start wait of the
// workflow that owns the work (the Support agent's incident, the Renewal agent's answer, the Sales agent's enquiry). The front door emits it without `link`:
// the callee carries the conversation on, as `callWorkflow` did in nivo-web-core.
import { z } from "zod"

/** What a hand-off carries: the person on the channel, the channel, the words that opened it and the front door's one line for the team. */
export const HandOffData = z.strictObject({
    channel: z.string().min(1).max(40),
    userId: z.string().min(1).max(200),
    msgId: z.string().min(1).max(200),
    text: z.string().max(8000),
    summary: z.string().min(1).max(600),
})

import { z } from "zod"
import type { JsonObject, Operation, OperationReach } from "@nivoos-lite/nivoos-sdk"
import { bodyOf, crmCodeOf, type CrmFields } from "./crm-calls.ts"
import { TICKET_CHANNELS, TICKET_KINDS, TicketOut, ticketOf } from "./ticket.shape.ts"

export const TicketCreateInput = z.strictObject({
    kind: z.enum(TICKET_KINDS),
    channel: z.enum(TICKET_CHANNELS),
    subject: z.string().min(1).max(200),
    summary: z.string().max(4000),
    customerCode: z.string().min(1).max(80).optional(),
    serviceCodes: z.array(z.string()).max(20).optional(),
    sourceRef: z.string().min(1).max(200).optional(),
})
export const TicketCreateOutput = z.strictObject({ ticket: TicketOut })

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof TicketCreateInput>
type Out = z.infer<typeof TicketCreateOutput>
type Refusal = "ticket_service_unknown" | "idempotency_key_reused"

/**
 * `nivoweb-crm.tickets.create`: opens one ticket (`POST /v1/tickets`). The CRM dedupes by `Idempotency-Key`, which is the act's intent key (the same on every re-attempt of the
 * call), so a retried node opens ONE ticket. Declares `ticket_service_unknown` (a service code the workspace does not have) and `idempotency_key_reused` (the key met another request).
 */
export class TicketCreate implements Operation<typeof TicketCreateInput, typeof TicketCreateOutput, Fields, Refusal> {
    readonly key = "nivoweb-crm.tickets.create"
    readonly version = 1
    readonly title = { vi: "Mở phiếu hỗ trợ", en: "Open a support ticket" }
    readonly input = TicketCreateInput
    readonly output = TicketCreateOutput
    readonly semantics = { mutates: true }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = ["ticket_service_unknown", "idempotency_key_reused"] as const

    run(input: In, reach: OperationReach<Fields, Refusal>): Out {
        const intentKey = reach.facts.intentKey
        if (intentKey === undefined) return reach.unknown("intent_key_missing")
        const body: { [member: string]: JsonObject[string] } = {
            kind: input.kind,
            channel: input.channel,
            subject: input.subject,
            summary: input.summary,
        }
        if (input.customerCode !== undefined) body["customerCode"] = input.customerCode
        if (input.serviceCodes !== undefined) body["serviceCodes"] = input.serviceCodes
        if (input.sourceRef !== undefined) body["sourceRef"] = input.sourceRef
        const response = reach.http({
            method: "POST",
            path: "/v1/tickets",
            headers: { "idempotency-key": intentKey },
            body,
        })
        const code = crmCodeOf(response)
        if (code === "CRM_TICKET_SERVICE_UNKNOWN") return reach.refuse("ticket_service_unknown")
        if (code === "CRM_IDEMPOTENCY_KEY_REUSED") return reach.refuse("idempotency_key_reused")
        const answer = bodyOf(response, 200, 201)
        const ticket = answer === null ? null : ticketOf(answer)
        if (ticket === null) return reach.byStatus()
        return { ticket }
    }
}

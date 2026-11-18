import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { type CrmBody, type CrmFields, jsonOf } from "./crm-calls.ts"
import { TICKET_CHANNELS, TICKET_KINDS, TicketOut, ticketOf } from "./ticket.shape.ts"

export const TicketCreateInput = z.strictObject({
    kind: z.enum(TICKET_KINDS),
    channel: z.enum(TICKET_CHANNELS),
    subject: z.string().min(1).max(200),
    summary: z.string().max(4000),
    customerCode: z.string().min(1).max(80).optional(),
    serviceCodes: z.array(z.string().max(80)).max(20).optional(),
    sourceRef: z.string().min(1).max(200).optional(),
})
export const TicketCreateOutput = z.strictObject({ ticket: TicketOut })

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof TicketCreateInput>
type Out = z.infer<typeof TicketCreateOutput>
type Refusal = "ticket_service_unknown"

/**
 * `nivoweb-crm.tickets.create`: opens one ticket (`POST /v1/tickets`). The CRM dedupes by `Idempotency-Key`, which is the act's intent key (the same on every re-attempt of the
 * call), so a retried node opens ONE ticket. Declares `ticket_service_unknown` (a service code the workspace does not have); the engine attaches the intent key from the declared wire (a reused key is an unclassified 4xx stop).
 */
export class TicketCreate implements Operation<typeof TicketCreateInput, typeof TicketCreateOutput, Fields, Refusal> {
    readonly key = "nivoweb-crm.tickets.create"
    readonly version = 2
    readonly title = { vi: "Mở phiếu hỗ trợ", en: "Open a support ticket" }
    readonly input = TicketCreateInput
    readonly output = TicketCreateOutput
    readonly semantics = { mutates: true }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = ["ticket_service_unknown"] as const
    readonly wire = {
        ok: [200, 201],
        errorField: "code",
        errorCodes: { CRM_TICKET_SERVICE_UNKNOWN: "ticket_service_unknown" },
        idempotency: { header: "idempotency-key" },
    } as const

    run(input: In, reach: OperationReach<Fields, Refusal>): Out {
        const body: CrmBody = {
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
            body,
        })
        const answer = jsonOf(response)
        const ticket = answer === null ? null : ticketOf(answer)
        if (ticket === null) return reach.byStatus()
        return { ticket }
    }
}

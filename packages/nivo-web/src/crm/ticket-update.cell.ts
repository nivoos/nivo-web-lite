import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { bodyOf, type CrmBody, crmCodeOf, type CrmFields } from "./crm-calls.ts"
import { TICKET_STATUSES, TicketOut, ticketOf } from "./ticket.shape.ts"

export const TicketUpdateInput = z.strictObject({
    id: z.uuid(),
    author: z.string().min(1).max(120),
    note: z.string().min(1).max(4000).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
})
export const TicketUpdateOutput = z.strictObject({ ticket: TicketOut })

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof TicketUpdateInput>
type Out = z.infer<typeof TicketUpdateOutput>
type Refusal = "ticket_not_found" | "ticket_transition_refused" | "ticket_update_empty" | "idempotency_key_reused"

/**
 * `nivoweb-crm.tickets.update`: adds a note and/or moves the status of one ticket (`PATCH /v1/tickets/{id}`), idempotent by the act's intent key. Declares `ticket_not_found`,
 * `ticket_transition_refused` (the status may not change that way), `ticket_update_empty` (neither a note nor a status) and `idempotency_key_reused`.
 */
export class TicketUpdate implements Operation<typeof TicketUpdateInput, typeof TicketUpdateOutput, Fields, Refusal> {
    readonly key = "nivoweb-crm.tickets.update"
    readonly version = 2
    readonly title = { vi: "Ghi chú hoặc đổi trạng thái phiếu", en: "Note or move a ticket" }
    readonly input = TicketUpdateInput
    readonly output = TicketUpdateOutput
    readonly semantics = { mutates: true }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = [
        "ticket_not_found",
        "ticket_transition_refused",
        "ticket_update_empty",
        "idempotency_key_reused",
    ] as const

    run(input: In, reach: OperationReach<Fields, Refusal>): Out {
        const intentKey = reach.facts.intentKey
        if (intentKey === undefined) return reach.unknown("intent_key_missing")
        const change: CrmBody = { author: input.author }
        if (input.note !== undefined) change["note"] = input.note
        if (input.status !== undefined) change["status"] = input.status
        const response = reach.http({
            method: "PATCH",
            path: `/v1/tickets/${input.id}`,
            headers: { "idempotency-key": intentKey },
            body: change,
        })
        const code = crmCodeOf(response)
        if (code === "CRM_TICKET_NOT_FOUND") return reach.refuse("ticket_not_found")
        if (code === "CRM_TICKET_TRANSITION_REFUSED") return reach.refuse("ticket_transition_refused")
        if (code === "CRM_TICKET_UPDATE_EMPTY") return reach.refuse("ticket_update_empty")
        if (code === "CRM_IDEMPOTENCY_KEY_REUSED") return reach.refuse("idempotency_key_reused")
        const body = bodyOf(response, 200)
        const ticket = body === null ? null : ticketOf(body)
        if (ticket === null) return reach.byStatus()
        return { ticket }
    }
}

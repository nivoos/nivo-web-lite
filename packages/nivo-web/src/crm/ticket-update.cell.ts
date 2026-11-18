import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { type CrmBody, type CrmFields, jsonOf } from "./crm-calls.ts"
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
type Refusal = "ticket_not_found" | "ticket_transition_refused" | "ticket_update_empty"

/**
 * `nivoweb-crm.tickets.update`: adds a note and/or moves the status of one ticket (`PATCH /v1/tickets/{id}`), idempotent by the act's intent key. Declares `ticket_not_found`,
 * `ticket_transition_refused` (the status may not change that way), `ticket_update_empty` (neither a note nor a status); the CRM's error codes and the idempotency header are the declared wire.
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
    readonly refusals = ["ticket_not_found", "ticket_transition_refused", "ticket_update_empty"] as const
    readonly wire = {
        ok: [200],
        errorField: "code",
        errorCodes: {
            CRM_TICKET_NOT_FOUND: "ticket_not_found",
            CRM_TICKET_TRANSITION_REFUSED: "ticket_transition_refused",
            CRM_TICKET_UPDATE_EMPTY: "ticket_update_empty",
        },
        idempotency: { header: "idempotency-key" },
    } as const

    run(input: In, reach: OperationReach<Fields, Refusal>): Out {
        const change: CrmBody = { author: input.author }
        if (input.note !== undefined) change["note"] = input.note
        if (input.status !== undefined) change["status"] = input.status
        const response = reach.http({
            method: "PATCH",
            path: `/v1/tickets/${input.id}`,
            body: change,
        })
        const body = jsonOf(response)
        const ticket = body === null ? null : ticketOf(body)
        if (ticket === null) return reach.byStatus()
        return { ticket }
    }
}

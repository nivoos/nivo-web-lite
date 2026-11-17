import { z } from "zod"
import type { Operation, OperationReach } from "@nivoos-lite/nivoos-sdk"
import { bodyOf, crmCodeOf, type CrmFields } from "./crm-calls.ts"
import { TicketOut, ticketOf } from "./ticket.shape.ts"

export const TicketGetInput = z.strictObject({ id: z.uuid() })
export const TicketGetOutput = z.strictObject({ ticket: TicketOut })

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof TicketGetInput>
type Out = z.infer<typeof TicketGetOutput>

/** `nivoweb-crm.tickets.get`: one ticket with its notes (`GET /v1/tickets/{id}`); declares `ticket_not_found`. */
export class TicketGet implements Operation<typeof TicketGetInput, typeof TicketGetOutput, Fields, "ticket_not_found"> {
    readonly key = "nivoweb-crm.tickets.get"
    readonly version = 1
    readonly title = { vi: "Xem phiếu hỗ trợ", en: "Read a ticket" }
    readonly input = TicketGetInput
    readonly output = TicketGetOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = ["ticket_not_found"] as const

    run(input: In, reach: OperationReach<Fields, "ticket_not_found">): Out {
        const response = reach.http({ method: "GET", path: `/v1/tickets/${input.id}` })
        if (crmCodeOf(response) === "CRM_TICKET_NOT_FOUND") return reach.refuse("ticket_not_found")
        const body = bodyOf(response, 200)
        const ticket = body === null ? null : ticketOf(body)
        if (ticket === null) return reach.byStatus()
        return { ticket }
    }
}

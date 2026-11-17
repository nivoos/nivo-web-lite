import { z } from "zod"
import type { Operation, OperationReach } from "@nivoos-lite/nivoos-sdk"
import { bodyOf, type CrmFields, PageOut, pageOf } from "./crm-calls.ts"
import { TICKET_STATUSES, TicketRowOut, ticketRowOf } from "./ticket.shape.ts"

export const TicketListInput = z.strictObject({
    customerCode: z.string().min(1).max(80).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().max(2048).optional(),
})
export const TicketListOutput = PageOut(TicketRowOut)

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof TicketListInput>
type Out = z.infer<typeof TicketListOutput>

/** `nivoweb-crm.tickets.list`: one page of tickets in the CRM's order (`GET /v1/tickets`), filtered by customer and status. */
export class TicketList implements Operation<typeof TicketListInput, typeof TicketListOutput, Fields, never> {
    readonly key = "nivoweb-crm.tickets.list"
    readonly version = 1
    readonly title = { vi: "Danh sách phiếu hỗ trợ", en: "List tickets" }
    readonly input = TicketListInput
    readonly output = TicketListOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = [] as const

    run(input: In, reach: OperationReach<Fields, never>): Out {
        const query: { [name: string]: string | number } = {}
        if (input.customerCode !== undefined) query["customerCode"] = input.customerCode
        if (input.status !== undefined) query["status"] = input.status
        if (input.limit !== undefined) query["limit"] = input.limit
        if (input.cursor !== undefined) query["cursor"] = input.cursor
        const body = bodyOf(reach.http({ method: "GET", path: "/v1/tickets", query }), 200)
        const page = body === null ? null : pageOf(body, ticketRowOf)
        if (page === null) return reach.byStatus()
        return page
    }
}

import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { bodyOf, type CrmFields, type CrmQuery, PageOut, pageOf } from "./crm-calls.ts"
import { CustomerRowOut, customerRowOf } from "./customer.shape.ts"

export const CustomerFindInput = z.strictObject({
    q: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().max(2048).optional(),
})
export const CustomerFindOutput = PageOut(CustomerRowOut)

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof CustomerFindInput>
type Out = z.infer<typeof CustomerFindOutput>

/** `nivoweb-crm.customers.find`: customers whose name, tax id, phone, mail or domain matches the words (`GET /v1/customers?q=`), one page. */
export class CustomerFind implements Operation<typeof CustomerFindInput, typeof CustomerFindOutput, Fields, never> {
    readonly key = "nivoweb-crm.customers.find"
    readonly version = 2
    readonly title = { vi: "Tìm khách hàng", en: "Find customers" }
    readonly input = CustomerFindInput
    readonly output = CustomerFindOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = [] as const

    run(input: In, reach: OperationReach<Fields, never>): Out {
        const query: CrmQuery = { q: input.q }
        if (input.limit !== undefined) query["limit"] = input.limit
        if (input.cursor !== undefined) query["cursor"] = input.cursor
        const body = bodyOf(reach.http({ method: "GET", path: "/v1/customers", query }), 200)
        const page = body === null ? null : pageOf(body, customerRowOf)
        if (page === null) return reach.byStatus()
        return page
    }
}

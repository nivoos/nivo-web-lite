import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { type CrmFields, jsonOf } from "./crm-calls.ts"
import { CustomerOut, customerOf } from "./customer.shape.ts"

export const CustomerGetInput = z.strictObject({ code: z.string().min(1).max(80) })
export const CustomerGetOutput = z.strictObject({ customer: CustomerOut })

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof CustomerGetInput>
type Out = z.infer<typeof CustomerGetOutput>

/** `nivoweb-crm.customers.get`: one customer by its code (`GET /v1/customers/{code}`); declares `customer_not_found`. */
export class CustomerGet implements Operation<
    typeof CustomerGetInput,
    typeof CustomerGetOutput,
    Fields,
    "customer_not_found"
> {
    readonly key = "nivoweb-crm.customers.get"
    readonly version = 2
    readonly title = { vi: "Xem khách hàng", en: "Read a customer" }
    readonly input = CustomerGetInput
    readonly output = CustomerGetOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = ["customer_not_found"] as const
    readonly wire = {
        ok: [200],
        errorField: "code",
        errorCodes: { CRM_CUSTOMER_NOT_FOUND: "customer_not_found" },
    } as const

    run(input: In, reach: OperationReach<Fields, "customer_not_found">): Out {
        const response = reach.http({ method: "GET", path: `/v1/customers/${encodeURIComponent(input.code)}` })
        const body = jsonOf(response)
        const customer = body === null ? null : customerOf(body)
        if (customer === null) return reach.byStatus()
        return { customer }
    }
}

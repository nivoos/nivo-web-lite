import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { bodyOf, crmCodeOf, type CrmFields, type CrmQuery, PageOut, pageOf } from "./crm-calls.ts"
import { ContractOut, contractOf } from "./customer.shape.ts"

export const CustomerContractsInput = z.strictObject({
    code: z.string().min(1).max(80),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().max(2048).optional(),
})
export const CustomerContractsOutput = PageOut(ContractOut)

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof CustomerContractsInput>
type Out = z.infer<typeof CustomerContractsOutput>

/** `nivoweb-crm.customers.contracts`: the contracts of one customer, one page (`GET /v1/customers/{code}/contracts`); declares `customer_not_found`. */
export class CustomerContracts implements Operation<
    typeof CustomerContractsInput,
    typeof CustomerContractsOutput,
    Fields,
    "customer_not_found"
> {
    readonly key = "nivoweb-crm.customers.contracts"
    readonly version = 2
    readonly title = { vi: "Hợp đồng của khách hàng", en: "A customer's contracts" }
    readonly input = CustomerContractsInput
    readonly output = CustomerContractsOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = ["customer_not_found"] as const

    run(input: In, reach: OperationReach<Fields, "customer_not_found">): Out {
        const query: CrmQuery = {}
        if (input.limit !== undefined) query["limit"] = input.limit
        if (input.cursor !== undefined) query["cursor"] = input.cursor
        const response = reach.http({
            method: "GET",
            path: `/v1/customers/${encodeURIComponent(input.code)}/contracts`,
            query,
        })
        if (crmCodeOf(response) === "CRM_CUSTOMER_NOT_FOUND") return reach.refuse("customer_not_found")
        const body = bodyOf(response, 200)
        const page = body === null ? null : pageOf(body, contractOf)
        if (page === null) return reach.byStatus()
        return page
    }
}

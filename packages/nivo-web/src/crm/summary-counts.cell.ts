import { z } from "zod"
import type { Operation, OperationReach } from "@starci/nivoos-sdk"
import { bodyOf, type CrmFields, intMember } from "./crm-calls.ts"

export const SummaryCountsInput = z.strictObject({})
export const SummaryCountsOutput = z.strictObject({
    customers: z.number().int().min(0),
    contracts: z.number().int().min(0),
    invoices: z.number().int().min(0),
    openReceivables: z.number().int().min(0),
    payables: z.number().int().min(0),
})

type Fields = z.infer<typeof CrmFields>
type In = z.infer<typeof SummaryCountsInput>
type Out = z.infer<typeof SummaryCountsOutput>

/** `nivoweb-crm.summary.counts`: the connect test, one read of the workspace's totals (`GET /v1/summary/counts`); a wrong service key is the CRM's 401 (`CRM_SERVICE_KEY_REJECTED`). */
export class SummaryCounts implements Operation<typeof SummaryCountsInput, typeof SummaryCountsOutput, Fields, never> {
    readonly key = "nivoweb-crm.summary.counts"
    readonly version = 2
    readonly title = { vi: "Số liệu tổng quan CRM", en: "CRM totals" }
    readonly input = SummaryCountsInput
    readonly output = SummaryCountsOutput
    readonly semantics = { mutates: false }
    readonly provider = "nivoweb-crm"
    readonly http = true
    readonly needs = ["baseUrl", "serviceKey"] as const
    readonly refusals = [] as const

    run(_input: In, reach: OperationReach<Fields, never>): Out {
        const body = bodyOf(reach.http({ method: "GET", path: "/v1/summary/counts" }), 200)
        const customers = body === null ? null : intMember(body, "customers")
        const contracts = body === null ? null : intMember(body, "contracts")
        const invoices = body === null ? null : intMember(body, "invoices")
        const openReceivables = body === null ? null : intMember(body, "openReceivables")
        const payables = body === null ? null : intMember(body, "payables")
        if (
            customers === null ||
            contracts === null ||
            invoices === null ||
            openReceivables === null ||
            payables === null
        )
            return reach.byStatus()
        return { customers, contracts, invoices, openReceivables, payables }
    }
}

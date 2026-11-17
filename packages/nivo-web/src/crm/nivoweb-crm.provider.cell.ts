import { type Provider, setup } from "@starci/nivoos-sdk"
import type { z } from "zod"
import { CrmFields } from "./crm-calls.ts"
import { SummaryCounts } from "./summary-counts.cell.ts"

/**
 * `nivoweb-crm`: the NIVO Web CRM service of this repository (`be/`, REST under `/v1`, described by `be/contracts/api/openapi.json`). An account is ONE enterprise workspace's connection:
 * the service's base URL (public) and the service credential `<id>.<secret>` that `cli credential issue --workspace <uuid> --label <text>` prints once (secret). The credential scopes every call
 * to its workspace; no header names it. The service is pure storage (its rules, such as quotes from the price table and idempotent money records, live in it), so this provider only reaches it.
 * No webhook, no rows kept. Sandbox first: the workspace's first account points at the CRM's dev or sandbox instance (see README.md).
 */
export class NivowebCrmProvider implements Provider<typeof CrmFields, z.ZodObject<{}>, {}> {
    readonly key = "nivoweb-crm"
    readonly version = 2
    readonly title = { vi: "CRM NIVO Web", en: "NIVO Web CRM" }
    readonly description = {
        vi: "Khách hàng, dịch vụ, hợp đồng và phiếu hỗ trợ trong CRM của NIVO Web: đọc để trả lời khách và ghi phiếu hỗ trợ.",
        en: "Customers, services, contracts and support tickets in the NIVO Web CRM: read to answer customers and write support tickets.",
    }
    readonly logo = { file: "logo.svg", mark: "monogram" } as const
    readonly fields = CrmFields
    readonly secrets = ["serviceKey"] as const
    readonly form = {
        baseUrl: {
            label: { vi: "Địa chỉ dịch vụ CRM", en: "CRM service address" },
            help: {
                vi: "Địa chỉ gốc của dịch vụ CRM (không có /v1), ví dụ địa chỉ bản sandbox khi mới bắt đầu.",
                en: "The CRM service's root address (without /v1), for example the sandbox instance when you start.",
            },
            kind: "url",
            order: 1,
        },
        serviceKey: {
            label: { vi: "Khoá dịch vụ CRM", en: "CRM service key" },
            help: {
                vi: "Khoá `<id>.<secret>` của đúng một workspace, do người vận hành cấp bằng `cli credential issue`; chỉ hiện một lần.",
                en: "The `<id>.<secret>` key of exactly one workspace, issued by the operator with `cli credential issue`; shown once.",
            },
            kind: "secret",
            order: 2,
        },
    } as const
    readonly identityField = "baseUrl"
    readonly kind = "base"
    readonly base = { field: "baseUrl" } as const
    readonly auth = { scheme: "bearer", secretField: "serviceKey" } as const
    readonly authWays = [{ kind: "fields" }] as const
    readonly connectTest = "nivoweb-crm.summary.counts"
    readonly setup = [
        setup.guide({
            key: "key",
            title: { vi: "Lấy khoá dịch vụ CRM", en: "Get the CRM service key" },
            body: {
                vi: "Người vận hành chạy `cli credential issue --workspace <uuid> --label <tên>` ở kho nivo-web-lite; khoá `<id>.<secret>` in ra một lần. Mỗi workspace một khoá; khoá chỉ thấy dữ liệu của workspace đó.",
                en: "The operator runs `cli credential issue --workspace <uuid> --label <name>` in the nivo-web-lite repository; the `<id>.<secret>` key is printed once. One key per workspace; it sees only that workspace's data.",
            },
        }),
        setup.fields({
            key: "credentials",
            title: { vi: "Nhập địa chỉ và khoá", en: "Enter the address and key" },
            fields: ["baseUrl", "serviceKey"],
        }),
        setup.check({
            key: "verify",
            title: { vi: "Kiểm tra CRM", en: "Check the CRM" },
            operation: SummaryCounts,
            show: "customers",
        }),
        setup.bind({ key: "agents", title: { vi: "Gắn vào tác tử", en: "Attach to agents" } }),
    ] as const
    readonly dataTypes = {}
}

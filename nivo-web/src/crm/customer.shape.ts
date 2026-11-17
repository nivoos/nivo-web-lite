import { z } from "zod"
import { boolMember, type CrmObject, numberMember, textMember, textsMember } from "./crm-calls.ts"

export const CUSTOMER_KINDS = ["company", "person", "unknown", "placeholder"] as const
export const SERVICE_CLASSES = ["hosting", "domain", "ssl"] as const
export const EXPIRY_SOURCES = ["provider", "estimated", "invoice", "confirmed", "none"] as const

/** A customer as a list row. */
export const CustomerRowOut = z.strictObject({
    code: z.string().min(1),
    kind: z.enum(CUSTOMER_KINDS),
    name: z.string(),
    taxId: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    reachable: z.boolean(),
})

/** A customer with the address and its domains (the contact people stay in the CRM). */
export const CustomerOut = CustomerRowOut.extend({ address: z.string().nullable(), domains: z.array(z.string()) })

/** One hosting, domain or SSL service of a customer. */
export const ServiceOut = z.strictObject({
    code: z.string().min(1),
    customerCode: z.string().min(1),
    domain: z.string().nullable(),
    serviceClass: z.enum(SERVICE_CLASSES),
    provider: z.string().nullable(),
    status: z.string(),
    statusText: z.string().nullable(),
    startsOn: z.string().nullable(),
    expiresOn: z.string().nullable(),
    expirySource: z.enum(EXPIRY_SOURCES),
})

/** One contract of a customer (money in whole dong). */
export const ContractOut = z.strictObject({
    contractNo: z.string().min(1),
    kind: z.string(),
    partnerName: z.string().nullable(),
    valueVnd: z.number().nullable(),
    signedOn: z.string().nullable(),
    effectiveOn: z.string().nullable(),
    expiresOn: z.string().nullable(),
    autoRenew: z.boolean().nullable(),
    warrantyUntil: z.string().nullable(),
    statusText: z.string().nullable(),
})

const oneOf = <T extends string>(values: ReadonlyArray<T>, value: string | null): T | null =>
    values.find((each) => each === value) ?? null

export const customerRowOf = (source: CrmObject): z.infer<typeof CustomerRowOut> | null => {
    const code = textMember(source, "code")
    const kind = oneOf(CUSTOMER_KINDS, textMember(source, "kind"))
    const name = textMember(source, "name")
    const reachable = boolMember(source, "reachable")
    if (code === null || kind === null || name === null || reachable === null) return null
    return {
        code,
        kind,
        name,
        taxId: textMember(source, "taxId"),
        phone: textMember(source, "phone"),
        email: textMember(source, "email"),
        reachable,
    }
}

export const customerOf = (source: CrmObject): z.infer<typeof CustomerOut> | null => {
    const row = customerRowOf(source)
    const domains = textsMember(source, "domains")
    if (row === null || domains === null) return null
    return { ...row, address: textMember(source, "address"), domains: [...domains] }
}

export const serviceOf = (source: CrmObject): z.infer<typeof ServiceOut> | null => {
    const code = textMember(source, "code")
    const customerCode = textMember(source, "customerCode")
    const serviceClass = oneOf(SERVICE_CLASSES, textMember(source, "serviceClass"))
    const status = textMember(source, "status")
    const expirySource = oneOf(EXPIRY_SOURCES, textMember(source, "expirySource"))
    if (code === null || customerCode === null || serviceClass === null || status === null || expirySource === null)
        return null
    return {
        code,
        customerCode,
        domain: textMember(source, "domain"),
        serviceClass,
        provider: textMember(source, "provider"),
        status,
        statusText: textMember(source, "statusText"),
        startsOn: textMember(source, "startsOn"),
        expiresOn: textMember(source, "expiresOn"),
        expirySource,
    }
}

export const contractOf = (source: CrmObject): z.infer<typeof ContractOut> | null => {
    const contractNo = textMember(source, "contractNo")
    const kind = textMember(source, "kind")
    if (contractNo === null || kind === null) return null
    return {
        contractNo,
        kind,
        partnerName: textMember(source, "partnerName"),
        valueVnd: numberMember(source, "valueVnd"),
        signedOn: textMember(source, "signedOn"),
        effectiveOn: textMember(source, "effectiveOn"),
        expiresOn: textMember(source, "expiresOn"),
        autoRenew: boolMember(source, "autoRenew"),
        warrantyUntil: textMember(source, "warrantyUntil"),
        statusText: textMember(source, "statusText"),
    }
}

import type { HttpResponse } from "@nivoos-lite/nivoos-sdk"
import { z } from "zod"

/** The fields of an account of `nivoweb-crm`: where the CRM service answers (public) and the service key of ONE enterprise workspace (secret, `<id>.<secret>`). */
export const CrmFields = z.strictObject({
    baseUrl: z.url(),
    serviceKey: z.string().min(1),
})

export type CrmObject = { readonly [member: string]: unknown }

export const isObject = (value: unknown): value is CrmObject =>
    typeof value === "object" && value !== null && !Array.isArray(value)

/** A text member, or null when it is absent or not a text. */
export const textMember = (source: CrmObject, member: string): string | null => {
    const value = source[member]
    return typeof value === "string" ? value : null
}

/** A whole-number member, or null. */
export const intMember = (source: CrmObject, member: string): number | null => {
    const value = source[member]
    return typeof value === "number" && Number.isInteger(value) ? value : null
}

/** A number member (the CRM sends money as a whole number of dong), or null. */
export const numberMember = (source: CrmObject, member: string): number | null => {
    const value = source[member]
    return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** A boolean member, or null. */
export const boolMember = (source: CrmObject, member: string): boolean | null => {
    const value = source[member]
    return typeof value === "boolean" ? value : null
}

/** A list member of objects, or null when it is absent or holds anything else. */
export const objectsMember = (source: CrmObject, member: string): ReadonlyArray<CrmObject> | null => {
    const value = source[member]
    if (!Array.isArray(value)) return null
    const objects: CrmObject[] = []
    for (const each of value) {
        if (!isObject(each)) return null
        objects.push(each)
    }
    return objects
}

/** A list member of texts, or null. */
export const textsMember = (source: CrmObject, member: string): ReadonlyArray<string> | null => {
    const value = source[member]
    if (!Array.isArray(value)) return null
    const texts: string[] = []
    for (const each of value) {
        if (typeof each !== "string") return null
        texts.push(each)
    }
    return texts
}

/** The body of a 200 or 201 answer when it is a JSON object, else null (the caller then asks `reach.byStatus()`). */
export const bodyOf = (response: HttpResponse, ...okStatuses: ReadonlyArray<number>): CrmObject | null =>
    okStatuses.includes(response.status) && isObject(response.json) ? response.json : null

/** The CRM's own error code of a refused call (`ErrorResponse.code`, e.g. `CRM_TICKET_NOT_FOUND`), or "" when the answer carries none. */
export const crmCodeOf = (response: HttpResponse): string =>
    isObject(response.json) ? (textMember(response.json, "code") ?? "") : ""

/** One page of a list: the items and the cursor of the next page (null at the end). */
export const PageOut = <T extends z.ZodType>(item: T) =>
    z.strictObject({ items: z.array(item), nextCursor: z.string().nullable() })

/** A page answer (`{ items, nextCursor }`) mapped item by item, or null when the answer or one item is not the contract's shape. */
export const pageOf = <T>(
    body: CrmObject,
    one: (source: CrmObject) => T | null,
): { readonly items: T[]; readonly nextCursor: string | null } | null => {
    const objects = objectsMember(body, "items")
    if (objects === null) return null
    const items: T[] = []
    for (const each of objects) {
        const mapped = one(each)
        if (mapped === null) return null
        items.push(mapped)
    }
    return { items, nextCursor: textMember(body, "nextCursor") }
}

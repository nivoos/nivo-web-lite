import type { HttpResponse, JsonObject } from "@starci/nivoos-sdk"
import { z } from "zod"

/** The fields of an account of `nivoweb-crm`: where the CRM service answers (public) and the service key of ONE enterprise workspace (secret, `<id>.<secret>`). */
export const CrmFields = z.strictObject({
    baseUrl: z.url().max(2048),
    serviceKey: z.string().min(1).max(500),
})

/** A JSON object of a CRM answer: members of unknown type, read through the member readers below. */
export type CrmObject = { readonly [member: string]: unknown }

/** The query string of a CRM call: the name of each parameter and its text or number value. */
export type CrmQuery = { [name: string]: string | number }

/** The JSON body of a CRM write: the name of each member and its JSON value. */
export type CrmBody = { [member: string]: JsonObject[string] }

/** True when `value` is a JSON object (not null, not a list). */
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
    const objects: Array<CrmObject> = []
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
    const texts: Array<string> = []
    for (const each of value) {
        if (typeof each !== "string") return null
        texts.push(each)
    }
    return texts
}

/** The JSON object of an answer the wire accepted (its status is one of the operation's `ok`), or null when the body is not an object (the caller then asks `reach.byStatus()`). */
export const jsonOf = (response: HttpResponse): CrmObject | null => (isObject(response.json) ? response.json : null)

/** One page of a list: the items and the cursor of the next page (null at the end). */
export const PageOut = <T extends z.ZodType>(item: T) =>
    z.strictObject({ items: z.array(item).max(1000), nextCursor: z.string().max(2048).nullable() })

/** A page answer (`{ items, nextCursor }`) mapped item by item, or null when the answer or one item is not the contract's shape. */
export const pageOf = <T>(
    body: CrmObject,
    one: (source: CrmObject) => T | null,
): { readonly items: Array<T>; readonly nextCursor: string | null } | null => {
    const objects = objectsMember(body, "items")
    if (objects === null) return null
    const items: Array<T> = []
    for (const each of objects) {
        const mapped = one(each)
        if (mapped === null) return null
        items.push(mapped)
    }
    return { items, nextCursor: textMember(body, "nextCursor") }
}

/** The CRM's list paging: the cursor parameter, where the next cursor and the items sit in the answer. One page per call (`maxPages` 1), so the tool keeps handing the agent a page and its cursor. */
export const PAGING = { cursorParam: "cursor", nextCursor: "nextCursor", items: "items", maxPages: 1 } as const

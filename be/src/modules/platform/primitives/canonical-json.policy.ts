import { createHash } from "node:crypto"
import { isRecord } from "./record.policy"

/** Orders object keys in code point order at every level; arrays keep their order; undefined members are dropped. */
const ordered = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((item: unknown) => ordered(item))
    if (!isRecord(value) || value instanceof Date) return value
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort((a, b) => (a < b ? -1 : Number(a > b)))) {
        const child = value[key]
        if (child !== undefined) result[key] = ordered(child)
    }
    return result
}

/** Canonical JSON text: keys sorted at every level, 2-space indent, LF, one trailing newline. Same data, same bytes. */
export const canonicalJson = (value: unknown): string => `${JSON.stringify(ordered(value), null, 2)}\n`

/** Lower-case hex sha256 of a UTF-8 text. */
export const sha256Hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex")

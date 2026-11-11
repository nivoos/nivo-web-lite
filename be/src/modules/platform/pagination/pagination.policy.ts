import { isRecord } from "@modules/platform/primitives"
import {
    type CursorKeys,
    type CursorText,
    DEFAULT_PAGE_SIZE,
    type KeyOf,
    type Keyset,
    MAX_PAGE_SIZE,
    type Page,
} from "./pagination.contracts"
import { PaginationError, PaginationErrorCode } from "./errors/pagination.error"

/** The cursor envelope: the list's name, so a cursor of another list is refused, and the key values. */
interface CursorBody {
    readonly l: string
    readonly k: ReadonlyArray<string>
}

const isCursorBody = (value: unknown): value is CursorBody =>
    isRecord(value) &&
    typeof value["l"] === "string" &&
    Array.isArray(value["k"]) &&
    value["k"].every((key: unknown) => typeof key === "string")

/** Clamps a page size into 1..MAX_PAGE_SIZE (the DTO bounds it already; this keeps a service safe on its own). */
export const pageSizeOf = (limit: number): number =>
    Number.isInteger(limit) ? Math.min(MAX_PAGE_SIZE, Math.max(1, limit)) : DEFAULT_PAGE_SIZE

/** Encodes a keyset position of one list as an opaque base64url text. */
export const encodeCursor = (list: string, keys: Keyset): string =>
    Buffer.from(JSON.stringify({ l: list, k: keys }), "utf8").toString("base64url")

/** Decodes a cursor of `list` with `width` keys; null for the first page; refuses anything else with PAGINATION_CURSOR_INVALID. */
export const decodeCursor = (list: string, cursor: CursorText, width: number): CursorKeys => {
    if (cursor === null) return null
    let parsed: unknown
    try {
        parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    } catch (cause: unknown) {
        throw new PaginationError({ code: PaginationErrorCode.CursorInvalid, cause })
    }
    if (!isCursorBody(parsed) || parsed.l !== list || parsed.k.length !== width) {
        throw new PaginationError({ code: PaginationErrorCode.CursorInvalid })
    }
    return parsed.k
}

/**
 * Cuts `limit + 1` rows read in the list's total order into a page: `items` are the views of the first `limit` rows, in the same
 * order; the extra row only proves a next page exists.
 */
export const pageOf = <Row, Item>(
    list: string,
    rows: ReadonlyArray<Row>,
    limit: number,
    keyOf: KeyOf<Row>,
    items: ReadonlyArray<Item>,
): Page<Item> => {
    const last = rows.slice(0, limit).at(-1)
    return { items, nextCursor: rows.length > limit && last !== undefined ? encodeCursor(list, keyOf(last)) : null }
}

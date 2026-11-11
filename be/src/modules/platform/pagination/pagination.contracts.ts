/** The largest page a list answers. */
export const MAX_PAGE_SIZE = 50

/** The page size when the caller names none. */
export const DEFAULT_PAGE_SIZE = 20

/** What a list takes: a bounded size and the opaque cursor of the previous page (null for the first). */
export interface PageInput {
    /** 1..MAX_PAGE_SIZE. */
    readonly limit: number
    /** The previous page's `nextCursor`, or null. */
    readonly cursor: string | null
}

/** What a list answers (the REST contract: `{ items, nextCursor }`). */
export interface Page<T> {
    /** The rows of this page, in the list's total order. */
    readonly items: ReadonlyArray<T>
    /** The cursor of the next page; null on the last page. */
    readonly nextCursor: string | null
}

/** A decoded keyset position: the sort-key values of the last row of the previous page, in sort order. */
export type Keyset = ReadonlyArray<string>

/** A decoded cursor, or null for the first page. */
export type CursorKeys = Keyset | null

/** The keyset position of one row of a list. */
export type KeyOf<Row> = (row: Row) => Keyset

/** The cursor a caller presents: the previous page's `nextCursor`, or null for the first page. */
export type CursorText = string | null

/** A list query's paging fields as the transport delivers them. */
export interface PageQuery {
    /** The page size, when given. */
    readonly limit?: number
    /** The previous page's cursor, when given. */
    readonly cursor?: string
}

import { isRecord } from "@modules/platform/primitives"

/** One aggregate row of a query builder, narrowed field by field (never cast). */
export interface FactRow {
    /** The grouped id. */
    readonly id: string
    /** count(*). */
    readonly count: number
    /** max(instant), or null. */
    readonly last: Date | null
    /** A text of the latest row (an outcome, an invoice number), or null. */
    readonly latest: string | null
}

const instantOf = (value: unknown): Date | null => {
    if (value instanceof Date) return value
    if (typeof value === "string" && value !== "") return new Date(value)
    return null
}

/** Narrows the raw rows of an aggregate (`id`, `count`, `last`, `latest`); a row without a text id is dropped. */
export const factRowsOf = (rows: unknown): ReadonlyArray<FactRow> =>
    Array.isArray(rows)
        ? rows.flatMap((row: unknown) => {
              if (!isRecord(row)) return []
              const { id, count, last, latest } = row
              if (typeof id !== "string") return []
              return [
                  {
                      id,
                      count: Number(count ?? 0),
                      last: instantOf(last),
                      latest: typeof latest === "string" ? latest : null,
                  },
              ]
          })
        : []

/** Indexes fact rows by id. */
export const factsById = (rows: ReadonlyArray<FactRow>): ReadonlyMap<string, FactRow> =>
    new Map(rows.map((row) => [row.id, row]))

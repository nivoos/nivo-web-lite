import { DEFAULT_PAGE_SIZE, type PageInput, type PageQuery } from "./pagination.contracts"

/** The page of a list query (`limit`, `cursor`), defaults applied. */
export const toPageInput = (query: PageQuery): PageInput => ({
    limit: query.limit ?? DEFAULT_PAGE_SIZE,
    cursor: query.cursor ?? null,
})

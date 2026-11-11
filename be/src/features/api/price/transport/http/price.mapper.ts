import { toPageInput } from "@modules/platform/pagination"
import type { PriceListInput } from "@modules/domain/crm"
import type { PageRequest } from "@modules/platform/openapi"

/** The request of `price.list`. */
export const toListRequest = (workspaceId: string, query: PageRequest): PriceListInput => ({
    workspaceId,
    page: toPageInput(query),
})

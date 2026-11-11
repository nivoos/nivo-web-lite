import { toPageInput } from "@modules/platform/pagination"
import type { PriceListInput } from "../../application/list-prices.query"
import type { ListPricesRequest } from "./dto/price.request"

/** The request of `price.list`. */
export const toListRequest = (workspaceId: string, query: ListPricesRequest): PriceListInput => ({
    workspaceId,
    kind: query.kind,
    page: toPageInput(query),
})

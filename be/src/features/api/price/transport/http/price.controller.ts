import { Controller, Get, Query } from "@nestjs/common"
import type { QueryBus } from "@nestjs/cqrs"
import { ApiTags } from "@nestjs/swagger"
import { CrmWorkspace } from "@modules/domain/crm"
import { Credential } from "@modules/domain/identity"
import { InjectQueryBus } from "@modules/platform/cqrs"
import { CrmOperation } from "@modules/platform/openapi"
import { ListPricesQuery } from "../../application/list-prices.query"
import { ListPricesRequest } from "./dto/price.request"
import { PricePageResponse } from "./dto/price.response"
import { toListRequest } from "./price.mapper"

@ApiTags("price")
@Controller()
@Credential({ kind: "api-key" })
/** The price door. */
export class PriceController {
    constructor(@InjectQueryBus() private readonly queryBus: QueryBus) {}

    /** `price.list`: List the renewal price table per service class and term (PLACEHOLDER until the owner's price sheet is loaded). */
    @Get("v1/prices")
    @CrmOperation({
        id: "price.list",
        summary:
            "List the price table by price code: NEW-sale and renewal rows (PLACEHOLDER until the owner's price sheet is loaded).",
        response: PricePageResponse,
        effect: "read",
        customerAudience: { parameter: null },
    })
    list(@CrmWorkspace() workspaceId: string, @Query() query: ListPricesRequest): Promise<PricePageResponse> {
        return this.queryBus.execute(new ListPricesQuery({ request: toListRequest(workspaceId, query) }))
    }
}

import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { CustomerFindInput, CustomerSummaryView } from "@modules/domain/crm"

/** Searches the customers of a workspace. */
export class FindCustomerQuery extends Query<Page<CustomerSummaryView>> {
    constructor(readonly params: PublicExecuteParams<CustomerFindInput>) {
        super()
    }
}

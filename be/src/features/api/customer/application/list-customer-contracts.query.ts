import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { ContractView, CustomerListInput } from "@modules/domain/crm"

/** Lists a customer's contracts. */
export class ListCustomerContractsQuery extends Query<Page<ContractView>> {
    constructor(readonly params: PublicExecuteParams<CustomerListInput>) {
        super()
    }
}

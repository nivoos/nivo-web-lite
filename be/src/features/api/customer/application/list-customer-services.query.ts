import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { CustomerListInput, ServiceView } from "@modules/domain/crm"

/** Lists a customer's services. */
export class ListCustomerServicesQuery extends Query<Page<ServiceView>> {
    constructor(readonly params: PublicExecuteParams<CustomerListInput>) {
        super()
    }
}

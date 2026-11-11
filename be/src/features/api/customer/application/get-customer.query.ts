import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { CustomerKey, CustomerView } from "@modules/domain/crm"

/** Reads one customer with its domains and contacts. */
export class GetCustomerQuery extends Query<CustomerView> {
    constructor(readonly params: PublicExecuteParams<CustomerKey>) {
        super()
    }
}

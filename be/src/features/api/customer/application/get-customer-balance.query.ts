import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { BalanceView, CustomerKey } from "@modules/domain/crm"

/** Reads a customer's TK131 balance and open receivables. */
export class GetCustomerBalanceQuery extends Query<BalanceView> {
    constructor(readonly params: PublicExecuteParams<CustomerKey>) {
        super()
    }
}

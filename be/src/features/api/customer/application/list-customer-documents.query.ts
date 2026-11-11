import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { CustomerListInput, DocumentView } from "@modules/domain/crm"

/** Lists a customer's document references. */
export class ListCustomerDocumentsQuery extends Query<Page<DocumentView>> {
    constructor(readonly params: PublicExecuteParams<CustomerListInput>) {
        super()
    }
}

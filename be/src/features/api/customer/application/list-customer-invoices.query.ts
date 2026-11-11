import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { CustomerListInput, InvoiceView } from "@modules/domain/crm"

/** Lists a customer's VAT invoices. */
export class ListCustomerInvoicesQuery extends Query<Page<InvoiceView>> {
    constructor(readonly params: PublicExecuteParams<CustomerListInput>) {
        super()
    }
}

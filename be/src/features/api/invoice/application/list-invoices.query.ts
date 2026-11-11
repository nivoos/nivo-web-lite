import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { InvoiceDraftsService } from "@modules/domain/crm"

/** The input of the workspace-wide invoice list. */
export type InvoiceListInput = Parameters<InvoiceDraftsService["listInvoices"]>[0]

/** One page of the workspace's VAT invoices. */
export type InvoiceListPage = Awaited<ReturnType<InvoiceDraftsService["listInvoices"]>>

/** Lists the workspace's VAT invoices. */
export class ListInvoicesQuery extends Query<InvoiceListPage> {
    constructor(readonly params: PublicExecuteParams<InvoiceListInput>) {
        super()
    }
}

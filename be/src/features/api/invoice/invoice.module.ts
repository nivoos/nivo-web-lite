import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./invoice.module-definition"
import { CreateInvoiceDraftHandler } from "./application/create-invoice-draft.handler"
import { GetInvoiceDraftHandler } from "./application/get-invoice-draft.handler"
import { ListInvoicesHandler } from "./application/list-invoices.handler"
import { RecordIssuedInvoiceHandler } from "./application/record-issued-invoice.handler"

@Module({
    providers: [CreateInvoiceDraftHandler, GetInvoiceDraftHandler, ListInvoicesHandler, RecordIssuedInvoiceHandler],
})
/** The invoice feature: the handlers of its application. */
export class InvoiceApiModule extends ConfigurableModuleClass {}

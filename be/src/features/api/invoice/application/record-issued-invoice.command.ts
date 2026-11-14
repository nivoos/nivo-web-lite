import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { InvoiceDraftView, InvoiceIssuedInput } from "@modules/domain/crm"

/** Records the e-invoice issued for a draft. */
export class RecordIssuedInvoiceCommand extends Command<InvoiceDraftView> {
    constructor(readonly params: PublicExecuteParams<InvoiceIssuedInput>) {
        super()
    }
}

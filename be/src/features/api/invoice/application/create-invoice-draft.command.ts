import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { InvoiceDraftCreateInput, InvoiceDraftView } from "@modules/domain/crm"

/** Drafts the invoice of a paid renewal. */
export class CreateInvoiceDraftCommand extends Command<InvoiceDraftView> {
    constructor(readonly params: PublicExecuteParams<InvoiceDraftCreateInput>) {
        super()
    }
}

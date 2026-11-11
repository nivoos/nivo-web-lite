import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { InvoiceDraftKey, InvoiceDraftView } from "@modules/domain/crm"

/** Reads one invoice draft. */
export class GetInvoiceDraftQuery extends Query<InvoiceDraftView> {
    constructor(readonly params: PublicExecuteParams<InvoiceDraftKey>) {
        super()
    }
}

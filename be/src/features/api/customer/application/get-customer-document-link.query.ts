import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { CustomerBookService } from "@modules/domain/crm"

/** The input of a document link: a customer's key and the document's path. */
export type DocumentLinkInput = Parameters<CustomerBookService["documentLink"]>[0]

/** A short-lived download link of a stored original. */
export type DocumentLink = Awaited<ReturnType<CustomerBookService["documentLink"]>>

/** Asks a short-lived download link of the stored original of one of a customer's documents. */
export class GetCustomerDocumentLinkQuery extends Query<DocumentLink> {
    constructor(readonly params: PublicExecuteParams<DocumentLinkInput>) {
        super()
    }
}

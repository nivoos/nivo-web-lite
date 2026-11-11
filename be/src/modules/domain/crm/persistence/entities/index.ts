import { CustomerEntity } from "./customer.entity"
import { ContactEntity } from "./contact.entity"
import { WebsiteEntity } from "./website.entity"
import { ServiceEntity } from "./service.entity"
import { ServiceReminderEntity } from "./service-reminder.entity"
import { ProviderAccountEntity } from "./provider-account.entity"
import { ProviderLinkEntity } from "./provider-link.entity"
import { RenewalRequestEntity } from "./renewal-request.entity"
import { ProjectEntity } from "./project.entity"
import { ContractEntity } from "./contract.entity"
import { InvoiceEntity } from "./invoice.entity"
import { ReceivableEntity } from "./receivable.entity"
import { LedgerBalanceEntity } from "./ledger-balance.entity"
import { DocumentEntity } from "./document.entity"
import { ImportRunEntity } from "./import-run.entity"
import { ImportIssueEntity } from "./import-issue.entity"
import { ImportChangeEntity } from "./import-change.entity"
import { ReceivableNoticeEntity } from "./receivable-notice.entity"
import { ReceivablePaymentEntity } from "./receivable-payment.entity"
import { PayableNoteEntity } from "./payable-note.entity"
import { TicketEntity } from "./ticket.entity"
import { TicketNoteEntity } from "./ticket-note.entity"
import { InvoiceDraftEntity } from "./invoice-draft.entity"
import { ServiceCredentialEntity } from "./service-credential.entity"

export { UuidAbstractEntity, bigintNumberTransformer } from "./uuid-abstract.entity"
export {
    CustomerEntity,
    ContactEntity,
    WebsiteEntity,
    ServiceEntity,
    ServiceReminderEntity,
    ProviderAccountEntity,
    ProviderLinkEntity,
    RenewalRequestEntity,
    ProjectEntity,
    ContractEntity,
    InvoiceEntity,
    ReceivableEntity,
    LedgerBalanceEntity,
    DocumentEntity,
    ImportRunEntity,
    ImportIssueEntity,
    ImportChangeEntity,
    ReceivableNoticeEntity,
    ReceivablePaymentEntity,
    PayableNoteEntity,
    TicketEntity,
    TicketNoteEntity,
    InvoiceDraftEntity,
    ServiceCredentialEntity,
}
export type { InvoiceDraftLineValue } from "./invoice-draft.entity"

/** Every entity of the crm schema, for the one data source. */
export const crmEntities: readonly [
    typeof CustomerEntity,
    typeof ContactEntity,
    typeof WebsiteEntity,
    typeof ServiceEntity,
    typeof ServiceReminderEntity,
    typeof ProviderAccountEntity,
    typeof ProviderLinkEntity,
    typeof RenewalRequestEntity,
    typeof ProjectEntity,
    typeof ContractEntity,
    typeof InvoiceEntity,
    typeof ReceivableEntity,
    typeof LedgerBalanceEntity,
    typeof DocumentEntity,
    typeof ImportRunEntity,
    typeof ImportIssueEntity,
    typeof ImportChangeEntity,
    typeof ReceivableNoticeEntity,
    typeof ReceivablePaymentEntity,
    typeof PayableNoteEntity,
    typeof TicketEntity,
    typeof TicketNoteEntity,
    typeof InvoiceDraftEntity,
    typeof ServiceCredentialEntity,
] = [
    CustomerEntity,
    ContactEntity,
    WebsiteEntity,
    ServiceEntity,
    ServiceReminderEntity,
    ProviderAccountEntity,
    ProviderLinkEntity,
    RenewalRequestEntity,
    ProjectEntity,
    ContractEntity,
    InvoiceEntity,
    ReceivableEntity,
    LedgerBalanceEntity,
    DocumentEntity,
    ImportRunEntity,
    ImportIssueEntity,
    ImportChangeEntity,
    ReceivableNoticeEntity,
    ReceivablePaymentEntity,
    PayableNoteEntity,
    TicketEntity,
    TicketNoteEntity,
    InvoiceDraftEntity,
    ServiceCredentialEntity,
] as const

import { Module, type DynamicModule } from "@nestjs/common"
import { CollectionsService } from "./collections.service"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./crm.module-definition"
import { CrmCredentialService } from "./crm-credential.service"
import { CrmImportService } from "./crm-import.service"
import { CustomerBookService } from "./customer-book.service"
import { OperatorOutputClient } from "./operator-output.client"
import { SnapshotFilesClient } from "./snapshot-files.client"
import { InvoiceDraftsService } from "./invoice-drafts.service"
import { RenewalsService } from "./renewals.service"
import { ServicesBookService } from "./services-book.service"
import { TicketsService } from "./tickets.service"

/** The domain services of the capability. */
const SERVICES = [
    CustomerBookService,
    ServicesBookService,
    CollectionsService,
    RenewalsService,
    TicketsService,
    InvoiceDraftsService,
    CrmCredentialService,
    CrmImportService,
]

@Module({})
/** The CRM of an enterprise workspace: the only writer of the crm tables the API serves. */
export class CrmModule extends ConfigurableModuleClass {
    /** Registers the capability once in the app root. */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const base = super.register(options)
        return {
            ...base,
            providers: [...(base.providers ?? []), ...SERVICES, OperatorOutputClient, SnapshotFilesClient],
            exports: [...SERVICES, OperatorOutputClient],
        }
    }
}

import type { DynamicModule, Type } from "@nestjs/common"
import { AuthHttpModule } from "@features/api/auth"
import { CustomerHttpModule } from "@features/api/customer"
import { InvoiceHttpModule } from "@features/api/invoice"
import { PayableHttpModule } from "@features/api/payable"
import { PriceHttpModule } from "@features/api/price"
import { PurchaseHttpModule } from "@features/api/purchase"
import { ReceivableHttpModule } from "@features/api/receivable"
import { RenewalHttpModule } from "@features/api/renewal"
import { ServiceHttpModule } from "@features/api/service"
import { TicketHttpModule } from "@features/api/ticket"

/** The API transports of the app: the sign-in doors and the CRM doors (REST, one transport module per feature). */
export const apiModules = (): Array<Type<unknown> | DynamicModule> => [
    AuthHttpModule.register({}),
    CustomerHttpModule.register({}),
    ServiceHttpModule.register({}),
    ReceivableHttpModule.register({}),
    PayableHttpModule.register({}),
    PriceHttpModule.register({}),
    RenewalHttpModule.register({}),
    TicketHttpModule.register({}),
    InvoiceHttpModule.register({}),
    PurchaseHttpModule.register({}),
]

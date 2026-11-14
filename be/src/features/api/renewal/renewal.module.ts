import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./renewal.module-definition"
import { CreateQuoteHandler } from "./application/create-quote.handler"
import { GetRenewalHandler } from "./application/get-renewal.handler"
import { ListOpenRenewalsHandler } from "./application/list-open-renewals.handler"
import { RecordRenewalPaymentHandler } from "./application/record-renewal-payment.handler"
import { RecordRenewalOutcomeHandler } from "./application/record-renewal-outcome.handler"

@Module({
    providers: [
        CreateQuoteHandler,
        GetRenewalHandler,
        ListOpenRenewalsHandler,
        RecordRenewalPaymentHandler,
        RecordRenewalOutcomeHandler,
    ],
})
/** The renewal feature: the handlers of its application. */
export class RenewalApiModule extends ConfigurableModuleClass {}

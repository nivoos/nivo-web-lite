import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./purchase.module-definition"
import { CreatePurchaseHandler } from "./application/create-purchase.handler"
import { UpdatePurchaseHandler } from "./application/update-purchase.handler"
import { GetPurchaseHandler } from "./application/get-purchase.handler"
import { ListOpenPurchasesHandler } from "./application/list-open-purchases.handler"
import { CreatePurchaseQuoteHandler } from "./application/create-purchase-quote.handler"
import { RecordFollowUpHandler } from "./application/record-follow-up.handler"
import { CreateCustomerHandler } from "./application/create-customer.handler"
import { RecordAcceptanceHandler } from "./application/record-acceptance.handler"
import { RecordPurchasePaymentHandler } from "./application/record-purchase-payment.handler"
import { RecordPurchaseOutcomeHandler } from "./application/record-purchase-outcome.handler"

@Module({
    providers: [
        CreatePurchaseHandler,
        UpdatePurchaseHandler,
        GetPurchaseHandler,
        ListOpenPurchasesHandler,
        CreatePurchaseQuoteHandler,
        RecordFollowUpHandler,
        CreateCustomerHandler,
        RecordAcceptanceHandler,
        RecordPurchasePaymentHandler,
        RecordPurchaseOutcomeHandler,
    ],
})
/** The purchase feature: the handlers of its application. */
export class PurchaseApiModule extends ConfigurableModuleClass {}

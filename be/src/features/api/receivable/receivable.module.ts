import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./receivable.module-definition"
import { ListOverdueReceivablesHandler } from "./application/list-overdue-receivables.handler"
import { RecordNoticeHandler } from "./application/record-notice.handler"
import { RecordReceivablePaymentHandler } from "./application/record-receivable-payment.handler"

@Module({ providers: [ListOverdueReceivablesHandler, RecordNoticeHandler, RecordReceivablePaymentHandler] })
/** The receivable feature: the handlers of its application. */
export class ReceivableApiModule extends ConfigurableModuleClass {}

import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./service.module-definition"
import { ListExpiringServicesHandler } from "./application/list-expiring-services.handler"
import { GetServiceStatusHandler } from "./application/get-service-status.handler"
import { RecordReminderHandler } from "./application/record-reminder.handler"

@Module({ providers: [ListExpiringServicesHandler, GetServiceStatusHandler, RecordReminderHandler] })
/** The service feature: the handlers of its application. */
export class ServiceApiModule extends ConfigurableModuleClass {}

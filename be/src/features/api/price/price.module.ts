import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price.module-definition"
import { ListPricesHandler } from "./application/list-prices.handler"

@Module({ providers: [ListPricesHandler] })
/** The price feature: the handlers of its application. */
export class PriceApiModule extends ConfigurableModuleClass {}

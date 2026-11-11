import { Module } from "@nestjs/common"
import { PurchaseApiModule } from "../../purchase.module"
import { ConfigurableModuleClass } from "./purchase-http.module-definition"
import { PurchaseController } from "./purchase.controller"

@Module({ imports: [PurchaseApiModule.register({})], controllers: [PurchaseController] })
/** The purchase HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class PurchaseHttpModule extends ConfigurableModuleClass {}

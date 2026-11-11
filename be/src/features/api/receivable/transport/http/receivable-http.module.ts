import { Module } from "@nestjs/common"
import { ReceivableApiModule } from "../../receivable.module"
import { ConfigurableModuleClass } from "./receivable-http.module-definition"
import { ReceivableController } from "./receivable.controller"

@Module({ imports: [ReceivableApiModule.register({})], controllers: [ReceivableController] })
/** The receivable HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class ReceivableHttpModule extends ConfigurableModuleClass {}

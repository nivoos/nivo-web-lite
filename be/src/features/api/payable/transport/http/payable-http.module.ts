import { Module } from "@nestjs/common"
import { PayableApiModule } from "../../payable.module"
import { ConfigurableModuleClass } from "./payable-http.module-definition"
import { PayableController } from "./payable.controller"

@Module({ imports: [PayableApiModule.register({})], controllers: [PayableController] })
/** The payable HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class PayableHttpModule extends ConfigurableModuleClass {}

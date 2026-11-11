import { Module } from "@nestjs/common"
import { PriceApiModule } from "../../price.module"
import { ConfigurableModuleClass } from "./price-http.module-definition"
import { PriceController } from "./price.controller"

@Module({ imports: [PriceApiModule.register({})], controllers: [PriceController] })
/** The price HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class PriceHttpModule extends ConfigurableModuleClass {}

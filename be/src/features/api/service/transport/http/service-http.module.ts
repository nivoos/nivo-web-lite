import { Module } from "@nestjs/common"
import { ServiceApiModule } from "../../service.module"
import { ConfigurableModuleClass } from "./service-http.module-definition"
import { ServiceController } from "./service.controller"

@Module({ imports: [ServiceApiModule.register({})], controllers: [ServiceController] })
/** The service HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class ServiceHttpModule extends ConfigurableModuleClass {}

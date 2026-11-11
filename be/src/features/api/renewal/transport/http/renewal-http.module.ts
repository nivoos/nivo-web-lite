import { Module } from "@nestjs/common"
import { RenewalApiModule } from "../../renewal.module"
import { ConfigurableModuleClass } from "./renewal-http.module-definition"
import { RenewalController } from "./renewal.controller"

@Module({ imports: [RenewalApiModule.register({})], controllers: [RenewalController] })
/** The renewal HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class RenewalHttpModule extends ConfigurableModuleClass {}

import { Module } from "@nestjs/common"
import { CustomerApiModule } from "../../customer.module"
import { ConfigurableModuleClass } from "./customer-http.module-definition"
import { CustomerController } from "./customer.controller"

@Module({ imports: [CustomerApiModule.register({})], controllers: [CustomerController] })
/** The customer HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class CustomerHttpModule extends ConfigurableModuleClass {}

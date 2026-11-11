import { Module } from "@nestjs/common"
import { InvoiceApiModule } from "../../invoice.module"
import { ConfigurableModuleClass } from "./invoice-http.module-definition"
import { InvoiceController } from "./invoice.controller"

@Module({ imports: [InvoiceApiModule.register({})], controllers: [InvoiceController] })
/** The invoice HTTP transport: its controller, declared statically (the OpenAPI emitter reads static controllers only). */
export class InvoiceHttpModule extends ConfigurableModuleClass {}

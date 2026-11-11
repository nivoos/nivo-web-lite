import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService, type ServiceView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListCustomerServicesQuery } from "./list-customer-services.query"

@QueryHandler(ListCustomerServicesQuery)
/** Lists a customer's services. One delegating call; the domain service decides. */
export class ListCustomerServicesHandler extends ICQRSHandler<ListCustomerServicesQuery, Page<ServiceView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: ListCustomerServicesQuery): Promise<Page<ServiceView>> {
        return this.customerBookService.listServices(message.params.request)
    }
}

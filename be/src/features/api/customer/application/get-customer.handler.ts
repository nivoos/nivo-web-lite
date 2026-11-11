import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService, type CustomerView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetCustomerQuery } from "./get-customer.query"

@QueryHandler(GetCustomerQuery)
/** Reads one customer with its domains and contacts. One delegating call; the domain service decides. */
export class GetCustomerHandler extends ICQRSHandler<GetCustomerQuery, CustomerView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: GetCustomerQuery): Promise<CustomerView> {
        return this.customerBookService.get(message.params.request)
    }
}

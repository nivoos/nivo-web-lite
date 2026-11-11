import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService, type CustomerSummaryView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { FindCustomerQuery } from "./find-customer.query"

@QueryHandler(FindCustomerQuery)
/** Searches the customers of a workspace. One delegating call; the domain service decides. */
export class FindCustomerHandler extends ICQRSHandler<FindCustomerQuery, Page<CustomerSummaryView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: FindCustomerQuery): Promise<Page<CustomerSummaryView>> {
        return this.customerBookService.search(message.params.request)
    }
}

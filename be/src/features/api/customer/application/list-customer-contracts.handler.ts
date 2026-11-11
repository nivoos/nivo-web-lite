import { QueryHandler } from "@nestjs/cqrs"
import { type ContractView, CustomerBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListCustomerContractsQuery } from "./list-customer-contracts.query"

@QueryHandler(ListCustomerContractsQuery)
/** Lists a customer's contracts. One delegating call; the domain service decides. */
export class ListCustomerContractsHandler extends ICQRSHandler<ListCustomerContractsQuery, Page<ContractView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: ListCustomerContractsQuery): Promise<Page<ContractView>> {
        return this.customerBookService.listContracts(message.params.request)
    }
}

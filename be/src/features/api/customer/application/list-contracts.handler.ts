import { QueryHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type ContractListPage, ListContractsQuery } from "./list-contracts.query"

@QueryHandler(ListContractsQuery)
/** Lists the workspace's contracts. One delegating call; the domain service decides. */
export class ListContractsHandler extends ICQRSHandler<ListContractsQuery, ContractListPage> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: ListContractsQuery): Promise<ContractListPage> {
        return this.purchasesService.listContracts(message.params.request)
    }
}

import { QueryHandler } from "@nestjs/cqrs"
import { CustomerBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetStateCountsQuery, type StateCountsView } from "./get-state-counts.query"

@QueryHandler(GetStateCountsQuery)
/** Asks the per-state counts of the calling workspace. One delegating call; the domain service decides. */
export class GetStateCountsHandler extends ICQRSHandler<GetStateCountsQuery, StateCountsView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: GetStateCountsQuery): Promise<StateCountsView> {
        return this.customerBookService.countsByState(message.params.request)
    }
}

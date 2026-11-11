import { QueryHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListOpenRenewalsQuery } from "./list-open-renewals.query"

@QueryHandler(ListOpenRenewalsQuery)
/** Lists the open renewal requests. One delegating call; the domain service decides. */
export class ListOpenRenewalsHandler extends ICQRSHandler<ListOpenRenewalsQuery, Page<RenewalView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: ListOpenRenewalsQuery): Promise<Page<RenewalView>> {
        return this.renewalsService.listOpen(message.params.request)
    }
}

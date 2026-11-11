import { QueryHandler } from "@nestjs/cqrs"
import { type ExpiringServiceView, ServicesBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { Page } from "@modules/platform/pagination"
import { ListExpiringServicesQuery } from "./list-expiring-services.query"

@QueryHandler(ListExpiringServicesQuery)
/** Lists the services ending soon with their reminder facts. One delegating call; the domain service decides. */
export class ListExpiringServicesHandler extends ICQRSHandler<ListExpiringServicesQuery, Page<ExpiringServiceView>> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly servicesBookService: ServicesBookService,
    ) {
        super(logger)
    }

    protected override process(message: ListExpiringServicesQuery): Promise<Page<ExpiringServiceView>> {
        return this.servicesBookService.listExpiring(message.params.request)
    }
}

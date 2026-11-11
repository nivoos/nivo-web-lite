import { QueryHandler } from "@nestjs/cqrs"
import { type ServiceStatusView, ServicesBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetServiceStatusQuery } from "./get-service-status.query"

@QueryHandler(GetServiceStatusQuery)
/** Reads a service's state from its provider plugin. One delegating call; the domain service decides. */
export class GetServiceStatusHandler extends ICQRSHandler<GetServiceStatusQuery, ServiceStatusView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly servicesBookService: ServicesBookService,
    ) {
        super(logger)
    }

    protected override process(message: GetServiceStatusQuery): Promise<ServiceStatusView> {
        return this.servicesBookService.status(message.params.request)
    }
}

import { QueryHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetRenewalQuery } from "./get-renewal.query"

@QueryHandler(GetRenewalQuery)
/** Reads one renewal request. One delegating call; the domain service decides. */
export class GetRenewalHandler extends ICQRSHandler<GetRenewalQuery, RenewalView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: GetRenewalQuery): Promise<RenewalView> {
        return this.renewalsService.get(message.params.request)
    }
}

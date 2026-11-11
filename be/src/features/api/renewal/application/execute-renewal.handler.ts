import { CommandHandler } from "@nestjs/cqrs"
import { type RenewalView, RenewalsService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { ExecuteRenewalCommand } from "./execute-renewal.command"

@CommandHandler(ExecuteRenewalCommand)
/** Asks the provider plugin to renew a paid request. One delegating call; the domain service decides. */
export class ExecuteRenewalHandler extends ICQRSHandler<ExecuteRenewalCommand, RenewalView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly renewalsService: RenewalsService,
    ) {
        super(logger)
    }

    protected override process(message: ExecuteRenewalCommand): Promise<RenewalView> {
        return this.renewalsService.execute(message.params.request)
    }
}

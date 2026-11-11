import { CommandHandler } from "@nestjs/cqrs"
import { PurchasesService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { type CreateCustomerResult, CreateCustomerCommand } from "./create-customer.command"

@CommandHandler(CreateCustomerCommand)
/** Opens a customer of the books for a purchase. One delegating call; the domain service decides. */
export class CreateCustomerHandler extends ICQRSHandler<CreateCustomerCommand, CreateCustomerResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly purchasesService: PurchasesService,
    ) {
        super(logger)
    }

    protected override process(message: CreateCustomerCommand): Promise<CreateCustomerResult> {
        return this.purchasesService.createCustomer(message.params.request)
    }
}

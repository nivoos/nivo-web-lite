import { QueryHandler } from "@nestjs/cqrs"
import { type BalanceView, CustomerBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { GetCustomerBalanceQuery } from "./get-customer-balance.query"

@QueryHandler(GetCustomerBalanceQuery)
/** Reads a customer's TK131 balance and open receivables. One delegating call; the domain service decides. */
export class GetCustomerBalanceHandler extends ICQRSHandler<GetCustomerBalanceQuery, BalanceView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: GetCustomerBalanceQuery): Promise<BalanceView> {
        return this.customerBookService.balance(message.params.request)
    }
}

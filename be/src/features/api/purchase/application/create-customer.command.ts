import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.createCustomer` takes. */
export type CreateCustomerInput = Parameters<PurchasesService["createCustomer"]>[0]

/** What `PurchasesService.createCustomer` answers. */
export type CreateCustomerResult = Awaited<ReturnType<PurchasesService["createCustomer"]>>

/** Opens a customer of the books for a purchase. */
export class CreateCustomerCommand extends Command<CreateCustomerResult> {
    constructor(readonly params: PublicExecuteParams<CreateCustomerInput>) {
        super()
    }
}

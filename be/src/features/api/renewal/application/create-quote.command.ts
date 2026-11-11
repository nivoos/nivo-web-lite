import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { QuoteInput, RenewalView } from "@modules/domain/crm"

/** Opens a renewal request awaiting payment. */
export class CreateQuoteCommand extends Command<RenewalView> {
    constructor(readonly params: PublicExecuteParams<QuoteInput>) {
        super()
    }
}

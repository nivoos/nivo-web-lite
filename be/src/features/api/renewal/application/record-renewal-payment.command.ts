import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { RenewalPaymentInput, RenewalView } from "@modules/domain/crm"

/** Marks a renewal paid by bank reference. */
export class RecordRenewalPaymentCommand extends Command<RenewalView> {
    constructor(readonly params: PublicExecuteParams<RenewalPaymentInput>) {
        super()
    }
}

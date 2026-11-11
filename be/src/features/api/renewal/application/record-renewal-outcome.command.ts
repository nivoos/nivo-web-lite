import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { RenewalOutcomeInput, RenewalView } from "@modules/domain/crm"

/** Records a person's confirmation of a renewal. */
export class RecordRenewalOutcomeCommand extends Command<RenewalView> {
    constructor(readonly params: PublicExecuteParams<RenewalOutcomeInput>) {
        super()
    }
}

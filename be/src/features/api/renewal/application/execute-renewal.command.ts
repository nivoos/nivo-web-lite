import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { RenewalExecuteInput, RenewalView } from "@modules/domain/crm"

/** Asks the provider plugin to renew a paid request. */
export class ExecuteRenewalCommand extends Command<RenewalView> {
    constructor(readonly params: PublicExecuteParams<RenewalExecuteInput>) {
        super()
    }
}

import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `PurchasesService.followUp` takes. */
export type RecordFollowUpInput = Parameters<PurchasesService["followUp"]>[0]

/** What `PurchasesService.followUp` answers. */
export type RecordFollowUpResult = Awaited<ReturnType<PurchasesService["followUp"]>>

/** Records today's follow-up of a purchase. */
export class RecordFollowUpCommand extends Command<RecordFollowUpResult> {
    constructor(readonly params: PublicExecuteParams<RecordFollowUpInput>) {
        super()
    }
}

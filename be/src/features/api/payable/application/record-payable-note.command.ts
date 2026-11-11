import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PayableNoteInput, PayableNoteView } from "@modules/domain/crm"

/** Notes a supplier invoice against a TK331 party. */
export class RecordPayableNoteCommand extends Command<PayableNoteView> {
    constructor(readonly params: PublicExecuteParams<PayableNoteInput>) {
        super()
    }
}

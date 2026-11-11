import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { ReminderRecordInput, ReminderView } from "@modules/domain/crm"

/** Records a reminder sent about a service. */
export class RecordReminderCommand extends Command<ReminderView> {
    constructor(readonly params: PublicExecuteParams<ReminderRecordInput>) {
        super()
    }
}

import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { NoticeRecordInput, NoticeView } from "@modules/domain/crm"

/** Records a notice sent about a receivable. */
export class RecordNoticeCommand extends Command<NoticeView> {
    constructor(readonly params: PublicExecuteParams<NoticeRecordInput>) {
        super()
    }
}

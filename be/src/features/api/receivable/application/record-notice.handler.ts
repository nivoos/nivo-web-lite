import { CommandHandler } from "@nestjs/cqrs"
import { CollectionsService, type NoticeView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordNoticeCommand } from "./record-notice.command"

@CommandHandler(RecordNoticeCommand)
/** Records a notice sent about a receivable. One delegating call; the domain service decides. */
export class RecordNoticeHandler extends ICQRSHandler<RecordNoticeCommand, NoticeView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly collectionsService: CollectionsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordNoticeCommand): Promise<NoticeView> {
        return this.collectionsService.recordNotice(message.params.request)
    }
}

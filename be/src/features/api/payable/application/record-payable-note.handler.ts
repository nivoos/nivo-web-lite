import { CommandHandler } from "@nestjs/cqrs"
import { CollectionsService, type PayableNoteView } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordPayableNoteCommand } from "./record-payable-note.command"

@CommandHandler(RecordPayableNoteCommand)
/** Notes a supplier invoice against a TK331 party. One delegating call; the domain service decides. */
export class RecordPayableNoteHandler extends ICQRSHandler<RecordPayableNoteCommand, PayableNoteView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly collectionsService: CollectionsService,
    ) {
        super(logger)
    }

    protected override process(message: RecordPayableNoteCommand): Promise<PayableNoteView> {
        return this.collectionsService.recordPayableNote(message.params.request)
    }
}

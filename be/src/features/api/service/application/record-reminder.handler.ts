import { CommandHandler } from "@nestjs/cqrs"
import { type ReminderView, ServicesBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { RecordReminderCommand } from "./record-reminder.command"

@CommandHandler(RecordReminderCommand)
/** Records a reminder sent about a service. One delegating call; the domain service decides. */
export class RecordReminderHandler extends ICQRSHandler<RecordReminderCommand, ReminderView> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly servicesBookService: ServicesBookService,
    ) {
        super(logger)
    }

    protected override process(message: RecordReminderCommand): Promise<ReminderView> {
        return this.servicesBookService.recordReminder(message.params.request)
    }
}

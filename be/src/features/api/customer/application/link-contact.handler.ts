import { CommandHandler } from "@nestjs/cqrs"
import { type ContactLinkResult, CustomerBookService } from "@modules/domain/crm"
import { ICQRSHandler } from "@modules/platform/cqrs"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import { LinkContactCommand } from "./link-contact.command"

@CommandHandler(LinkContactCommand)
/** Links a contact address to a customer. One delegating call; the domain service decides. */
export class LinkContactHandler extends ICQRSHandler<LinkContactCommand, ContactLinkResult> {
    constructor(
        @InjectLogger() logger: Logger,
        private readonly customerBookService: CustomerBookService,
    ) {
        super(logger)
    }

    protected override process(message: LinkContactCommand): Promise<ContactLinkResult> {
        return this.customerBookService.linkContact(message.params.request)
    }
}

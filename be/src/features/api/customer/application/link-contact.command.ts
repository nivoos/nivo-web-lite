import { Command } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { ContactLinkInput, ContactLinkResult } from "@modules/domain/crm"

/** Links a contact address to a customer. */
export class LinkContactCommand extends Command<ContactLinkResult> {
    constructor(readonly params: PublicExecuteParams<ContactLinkInput>) {
        super()
    }
}

import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { TicketKey, TicketView } from "@modules/domain/crm"

/** Reads one ticket with its notes. */
export class GetTicketQuery extends Query<TicketView> {
    constructor(readonly params: PublicExecuteParams<TicketKey>) {
        super()
    }
}

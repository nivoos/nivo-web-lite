import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { TicketListInput, TicketSummaryView } from "@modules/domain/crm"

/** Lists tickets newest first. */
export class ListTicketsQuery extends Query<Page<TicketSummaryView>> {
    constructor(readonly params: PublicExecuteParams<TicketListInput>) {
        super()
    }
}

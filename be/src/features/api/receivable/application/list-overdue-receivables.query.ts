import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { OverdueInput, ReceivableView } from "@modules/domain/crm"

/** Lists the overdue real receivables. */
export class ListOverdueReceivablesQuery extends Query<Page<ReceivableView>> {
    constructor(readonly params: PublicExecuteParams<OverdueInput>) {
        super()
    }
}

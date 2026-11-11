import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { PayableListInput, PayableView } from "@modules/domain/crm"

/** Lists the TK331 parties. */
export class ListPayablesQuery extends Query<Page<PayableView>> {
    constructor(readonly params: PublicExecuteParams<PayableListInput>) {
        super()
    }
}

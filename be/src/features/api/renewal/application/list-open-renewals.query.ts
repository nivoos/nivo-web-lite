import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { RenewalOpenListInput, RenewalView } from "@modules/domain/crm"

/** Lists the open renewal requests. */
export class ListOpenRenewalsQuery extends Query<Page<RenewalView>> {
    constructor(readonly params: PublicExecuteParams<RenewalOpenListInput>) {
        super()
    }
}

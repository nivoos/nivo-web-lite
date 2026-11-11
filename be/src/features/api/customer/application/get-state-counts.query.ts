import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { CustomerBookService } from "@modules/domain/crm"

/** The per-state counts of a workspace. */
export type StateCountsView = Awaited<ReturnType<CustomerBookService["countsByState"]>>

/** Asks the per-state counts of the calling workspace. */
export class GetStateCountsQuery extends Query<StateCountsView> {
    constructor(readonly params: PublicExecuteParams<string>) {
        super()
    }
}

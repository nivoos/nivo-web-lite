import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { Page } from "@modules/platform/pagination"
import type { ExpiringInput, ExpiringServiceView } from "@modules/domain/crm"

/** Lists the services ending soon with their reminder facts. */
export class ListExpiringServicesQuery extends Query<Page<ExpiringServiceView>> {
    constructor(readonly params: PublicExecuteParams<ExpiringInput>) {
        super()
    }
}

import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { ServiceKey, ServiceStatusView } from "@modules/domain/crm"

/** Reads a service's state from its provider plugin. */
export class GetServiceStatusQuery extends Query<ServiceStatusView> {
    constructor(readonly params: PublicExecuteParams<ServiceKey>) {
        super()
    }
}

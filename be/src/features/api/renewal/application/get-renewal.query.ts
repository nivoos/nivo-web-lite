import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { RenewalKey, RenewalView } from "@modules/domain/crm"

/** Reads one renewal request. */
export class GetRenewalQuery extends Query<RenewalView> {
    constructor(readonly params: PublicExecuteParams<RenewalKey>) {
        super()
    }
}

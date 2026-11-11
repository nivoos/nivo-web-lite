import { Query } from "@nestjs/cqrs"
import type { PublicExecuteParams } from "@modules/platform/cqrs"
import type { PurchasesService } from "@modules/domain/crm"

/** What `contract.list` reads: the calling workspace, an optional kind and customer code, the page. */
export type ContractListInput = Parameters<PurchasesService["listContracts"]>[0]

/** One page of the workspace's contracts. */
export type ContractListPage = Awaited<ReturnType<PurchasesService["listContracts"]>>

/** Lists the workspace's contracts. */
export class ListContractsQuery extends Query<ContractListPage> {
    constructor(readonly params: PublicExecuteParams<ContractListInput>) {
        super()
    }
}

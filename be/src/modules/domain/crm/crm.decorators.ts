import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { injector, type TypedParameterDecorator } from "@modules/platform/composition"
import { requestOf } from "@modules/platform/http-security"
import { idempotencyKeyOf, workspaceOf } from "./crm-request.policy"
import type { PriceRowView } from "./renewal.contracts"

/** The tenant of a CRM door: the workspace of the service credential that authenticated the call; nothing the caller sends. */
export const CrmWorkspace: ReturnType<typeof createParamDecorator> = createParamDecorator(
    (_data: unknown, context: ExecutionContext): string =>
        workspaceOf(requestOf(context).credentialPrincipal?.workspaceId),
)

/** The `Idempotency-Key` of a keyed CRM write. */
export const CrmIdempotencyKey: ReturnType<typeof createParamDecorator> = createParamDecorator(
    (_data: unknown, context: ExecutionContext): string =>
        idempotencyKeyOf(requestOf(context).headers["idempotency-key"]),
)

/** Token of the price table quotes are made from: the placeholder table until the owner's sheet is loaded. */
export const CRM_PRICE_TABLE: unique symbol = Symbol("domain.crm.price-table")

/** Injects the price table. Parameter type: ReadonlyArray<PriceRowView>. */
export const InjectCrmPriceTable = (): TypedParameterDecorator<ReadonlyArray<PriceRowView>> =>
    injector<ReadonlyArray<PriceRowView>>(CRM_PRICE_TABLE)

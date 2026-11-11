import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { injector, type TypedParameterDecorator } from "@modules/platform/composition"
import { requestOf } from "@modules/platform/http-security"
import type { CrmOptions } from "./crm.options"
import { idempotencyKeyOf, workspaceOf } from "./crm-request.policy"

/** Token of the CRM capability's options. */
export const CRM_OPTIONS: unique symbol = Symbol("domain.crm.options")

/** Injects the CRM options. Parameter type: CrmOptions. */
export const InjectCrmOptions = (): TypedParameterDecorator<CrmOptions> => injector<CrmOptions>(CRM_OPTIONS)

/** The tenant selector of a CRM door: the `X-Workspace-Id` uuid, which must be the workspace the service key acts for. */
export const CrmWorkspace: ReturnType<typeof createParamDecorator> = createParamDecorator(
    (_data: unknown, context: ExecutionContext): string => {
        const request = requestOf(context)
        return workspaceOf(request.headers["x-workspace-id"], request.credentialPrincipal?.workspaceId)
    },
)

/** The `Idempotency-Key` of a keyed CRM write. */
export const CrmIdempotencyKey: ReturnType<typeof createParamDecorator> = createParamDecorator(
    (_data: unknown, context: ExecutionContext): string =>
        idempotencyKeyOf(requestOf(context).headers["idempotency-key"]),
)

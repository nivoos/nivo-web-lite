import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { requestOf } from "@modules/platform/http-security"
import { idempotencyKeyOf, workspaceOf } from "./crm-request.policy"

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

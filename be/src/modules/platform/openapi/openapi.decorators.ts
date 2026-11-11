import { HttpCode, applyDecorators, type Type } from "@nestjs/common"
import { ApiBearerAuth, ApiDefaultResponse, ApiExtension, ApiHeader, ApiOperation, ApiResponse } from "@nestjs/swagger"
import { ErrorResponse } from "./error.response"

/** The name of the CRM security scheme: `Authorization: Bearer <CRM_SERVICE_KEY>`, declared in the app's OpenAPI head. */
const SERVICE_KEY_SCHEME = "serviceKey"

/** How an operation changes state, for the NIVO tool declaration. */
export type OperationEffect = "read" | "write"

/** The 2xx status of an operation: 201 for a POST that creates a record, 200 otherwise. */
export type OperationStatus = 200 | 201

/** One CRM operation's contract. */
export interface CrmOperationSpec {
    /** The stable operationId, `<feature>.<action>`, singular; a NIVO tool id is `crm.` + this id. */
    readonly id: string
    /** One line: what the operation does and changes, and whether it costs money. */
    readonly summary: string
    /** The named schema of the 2xx response. */
    readonly response: Type<unknown>
    /** read or write. */
    readonly effect: OperationEffect
    /** True when the write takes an `Idempotency-Key` header (a write with a natural key is idempotent without one). */
    readonly idempotencyKey?: boolean
    /** True when the operation can spend money or is a legal act (`x-crm-money`). */
    readonly money?: boolean
    /** The 2xx status; 200 when absent. */
    readonly status?: OperationStatus
}

/** The workspace header every CRM operation reads. */
const WORKSPACE_HEADER = ApiHeader({
    name: "X-Workspace-Id",
    required: true,
    schema: { type: "string", format: "uuid" },
})

/** The replay header of a keyed write. */
const REPLAY_HEADER = ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", pattern: "^[A-Za-z0-9._:-]{1,200}$" },
})

/** Declares one CRM operation: id, summary, the service-key scheme, the headers, the 2xx schema and the shared error body as default. */
export const CrmOperation = (spec: CrmOperationSpec): MethodDecorator =>
    applyDecorators(
        ApiOperation({ operationId: spec.id, summary: spec.summary }),
        ApiBearerAuth(SERVICE_KEY_SCHEME),
        WORKSPACE_HEADER,
        ...(spec.idempotencyKey === true ? [REPLAY_HEADER] : []),
        ApiExtension("x-crm-effect", spec.effect),
        ApiExtension("x-crm-money", spec.money === true),
        HttpCode(spec.status ?? 200),
        ApiResponse({ status: spec.status ?? 200, type: spec.response }),
        ApiDefaultResponse({ type: ErrorResponse }),
    )

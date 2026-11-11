import { HttpCode, applyDecorators, type Type } from "@nestjs/common"
import { ApiBearerAuth, ApiDefaultResponse, ApiExtension, ApiHeader, ApiOperation, ApiResponse } from "@nestjs/swagger"
import { ErrorResponse } from "./error.response"

/** The name of the CRM security scheme: `Authorization: Bearer <id>.<secret>` of a service credential of one workspace, declared in the app's OpenAPI head. */
const SERVICE_KEY_SCHEME = "serviceKey"

/** How an operation changes state, for the NIVO tool declaration (`x-crm-effect`). */
export type OperationEffect = "read" | "write"

/**
 * What a write can do beyond the CRM's own records, declared by the provider for NIVO and never inferred (`x-nivo-effect`): `money`
 * spends or moves money, `irreversible` cannot be taken back, `none` neither. NIVO runs a write marked other than `none` only
 * after a person was asked.
 */
export type NivoEffect = "money" | "irreversible" | "none"

/** The 2xx status of an operation: 201 for a POST that creates a record, 200 otherwise. */
export type OperationStatus = 200 | 201

/**
 * A run that serves a customer (a conversation) may call the operation (`x-nivo-customer-audience: true`); `parameter` names the path
 * or query parameter holding the one customer's code, which NIVO fills from the conversation's trusted link, never from the model
 * (`x-nivo-customer-parameter`), or null when the operation reads no one customer.
 */
export interface CustomerAudience {
    /** The parameter of the customer code, or null. */
    readonly parameter: string | null
}

/** What every CRM operation declares. */
interface CrmOperationBase {
    /** The stable operationId, `<feature>.<action>`, singular; a NIVO tool id is `crm.` + this id. */
    readonly id: string
    /** One line: what the operation does and changes, and whether it costs money. */
    readonly summary: string
    /** The named schema of the 2xx response. */
    readonly response: Type<unknown>
    /** True when the write takes an `Idempotency-Key` header (a write with a natural key is idempotent without one). */
    readonly idempotencyKey?: boolean
    /** The 2xx status; 200 when absent. */
    readonly status?: OperationStatus
    /** Set when a customer-facing run may call the operation; absent: internal runs only. */
    readonly customerAudience?: CustomerAudience
}

/** A read. */
export interface CrmReadOperation extends CrmOperationBase {
    /** read. */
    readonly effect: "read"
}

/** A write, which always declares its NIVO effect. */
export interface CrmWriteOperation extends CrmOperationBase {
    /** write. */
    readonly effect: "write"
    /** What the write can do beyond the CRM's records. */
    readonly nivoEffect: NivoEffect
}

/** One CRM operation's contract. */
export type CrmOperationSpec = CrmReadOperation | CrmWriteOperation

/** The NIVO marks of an operation: the effect of a write and the customer audience. */
const nivoMarks = (spec: CrmOperationSpec): Array<MethodDecorator> => [
    ...(spec.effect === "write" ? [ApiExtension("x-nivo-effect", spec.nivoEffect)] : []),
    ...(spec.customerAudience === undefined
        ? []
        : [
              ApiExtension("x-nivo-customer-audience", true),
              ...(spec.customerAudience.parameter === null
                  ? []
                  : [ApiExtension("x-nivo-customer-parameter", spec.customerAudience.parameter)]),
          ]),
]

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
        ...(spec.idempotencyKey === true ? [REPLAY_HEADER] : []),
        ApiExtension("x-crm-effect", spec.effect),
        ...nivoMarks(spec),
        HttpCode(spec.status ?? 200),
        ApiResponse({ status: spec.status ?? 200, type: spec.response }),
        ApiDefaultResponse({ type: ErrorResponse }),
    )

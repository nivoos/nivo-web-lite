import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { CrmErrorCode } from "./errors/crm.error"
import { idempotencyKeyOf, workspaceOf } from "./crm-request.policy"

/** The code a call threw, or undefined when it returned. */
const codeOf = (call: () => unknown): string | undefined => {
    try {
        call()
    } catch (error: unknown) {
        return isDomainError(error) ? error.code : "uncoded"
    }
    return undefined
}

const CRM_REQUEST_POLICY: unique symbol = Symbol("crm-request")

/** The policy under test, resolved through a testing module. */
interface CrmRequestPolicy {
    readonly idempotencyKeyOf: typeof idempotencyKeyOf
    readonly workspaceOf: typeof workspaceOf
}

const policy = async (): Promise<CrmRequestPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            { provide: CRM_REQUEST_POLICY, useFactory: (): CrmRequestPolicy => ({ idempotencyKeyOf, workspaceOf }) },
        ],
    }).compile()
    return moduleRef.get<CrmRequestPolicy>(CRM_REQUEST_POLICY)
}

const WS = "6f1c2a9e-0000-4000-8000-00000000a001"

describe("crm request policy", () => {
    let subject: CrmRequestPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("answers the workspace of the credential that authenticated the call, and nothing a caller sends", () => {
        expect(subject.workspaceOf(WS)).toBe(WS)
    })

    it("refuses a call no credential authenticated", () => {
        expect(codeOf(() => subject.workspaceOf(undefined))).toBe(CrmErrorCode.ServiceKeyRejected)
    })

    it("answers a bounded replay key and refuses an absent or foreign one", () => {
        expect(subject.idempotencyKeyOf("zalo:conv-1:msg-9")).toBe("zalo:conv-1:msg-9")
        expect(codeOf(() => subject.idempotencyKeyOf(undefined))).toBe(CrmErrorCode.IdempotencyKeyInvalid)
        expect(codeOf(() => subject.idempotencyKeyOf("a b"))).toBe(CrmErrorCode.IdempotencyKeyInvalid)
    })
})

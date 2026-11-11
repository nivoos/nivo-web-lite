import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { CrmErrorCode } from "./errors/crm.error"
import { isReplay, requestHashOf } from "./request-key.policy"

/** The code a call threw, or undefined when it returned. */
const codeOf = (call: () => unknown): string | undefined => {
    try {
        call()
    } catch (error: unknown) {
        return isDomainError(error) ? error.code : "uncoded"
    }
    return undefined
}

const REQUEST_KEY_POLICY: unique symbol = Symbol("request-key")

/** The policy under test, resolved through a testing module. */
interface RequestKeyPolicy {
    readonly isReplay: typeof isReplay
    readonly requestHashOf: typeof requestHashOf
}

const policy = async (): Promise<RequestKeyPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: REQUEST_KEY_POLICY, useFactory: (): RequestKeyPolicy => ({ isReplay, requestHashOf }) }],
    }).compile()
    return moduleRef.get<RequestKeyPolicy>(REQUEST_KEY_POLICY)
}

describe("request key policy", () => {
    let subject: RequestKeyPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("hashes a request independent of key order", () => {
        expect(subject.requestHashOf({ a: 1, b: "x" })).toBe(subject.requestHashOf({ b: "x", a: 1 }))
        expect(subject.requestHashOf({ a: 1 })).toHaveLength(64)
    })

    it("answers new without a stored row, replay for the same request, and refuses another request under the key", () => {
        const hash = subject.requestHashOf({ a: 1 })
        expect(subject.isReplay(null, hash)).toBe(false)
        expect(subject.isReplay({ requestHash: hash }, hash)).toBe(true)
        expect(codeOf(() => subject.isReplay({ requestHash: subject.requestHashOf({ a: 2 }) }, hash))).toBe(
            CrmErrorCode.IdempotencyKeyReused,
        )
    })
})

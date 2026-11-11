import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { CrmErrorCode } from "./errors/crm.error"
import { assertConfirmable, assertExecutable, assertPayable } from "./renewal-state.policy"

/** The code a call threw, or undefined when it returned. */
const codeOf = (call: () => unknown): string | undefined => {
    try {
        call()
    } catch (error: unknown) {
        return isDomainError(error) ? error.code : "uncoded"
    }
    return undefined
}

const RENEWAL_STATE_POLICY: unique symbol = Symbol("renewal-state")

/** The policy under test, resolved through a testing module. */
interface RenewalStatePolicy {
    readonly assertConfirmable: typeof assertConfirmable
    readonly assertExecutable: typeof assertExecutable
    readonly assertPayable: typeof assertPayable
}

const policy = async (): Promise<RenewalStatePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: RENEWAL_STATE_POLICY,
                useFactory: (): RenewalStatePolicy => ({ assertConfirmable, assertExecutable, assertPayable }),
            },
        ],
    }).compile()
    return moduleRef.get<RenewalStatePolicy>(RENEWAL_STATE_POLICY)
}

describe("renewal state policy", () => {
    let subject: RenewalStatePolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("records a payment only while the request awaits it", () => {
        expect(codeOf(() => subject.assertPayable("awaiting_payment"))).toBeUndefined()
        expect(codeOf(() => subject.assertPayable("paid"))).toBe(CrmErrorCode.RenewalStateRefused)
    })

    it("refuses the provider step on an unpaid request with CRM_RENEWAL_NOT_PAID, and on any state but paid", () => {
        expect(codeOf(() => subject.assertExecutable("awaiting_payment"))).toBe(CrmErrorCode.RenewalNotPaid)
        expect(codeOf(() => subject.assertExecutable("renewed"))).toBe(CrmErrorCode.RenewalStateRefused)
        expect(codeOf(() => subject.assertExecutable("paid"))).toBeUndefined()
    })

    it("confirms only a request waiting for a person", () => {
        expect(codeOf(() => subject.assertConfirmable("pending_person"))).toBeUndefined()
        expect(codeOf(() => subject.assertConfirmable("paid"))).toBe(CrmErrorCode.RenewalStateRefused)
    })
})

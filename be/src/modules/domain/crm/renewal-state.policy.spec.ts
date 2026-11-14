import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { CrmErrorCode } from "./errors/crm.error"
import type { RenewalOutcome } from "./renewal.contracts"
import { assertPayable, assertRecordable, stateOfOutcome } from "./renewal-state.policy"

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
    readonly assertPayable: typeof assertPayable
    readonly assertRecordable: typeof assertRecordable
    readonly stateOfOutcome: typeof stateOfOutcome
}

const policy = async (): Promise<RenewalStatePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: RENEWAL_STATE_POLICY,
                useFactory: (): RenewalStatePolicy => ({ assertPayable, assertRecordable, stateOfOutcome }),
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

    // Owner ruling R57 (2026-11-14): the CRM renews nothing; the Renewal agent renews at the provider and RECORDS the answer here, so
    // a paid request takes the outcome directly (the provider step and its `pending_person` hand-over inside the CRM are gone).
    it("refuses an outcome on an unpaid request with CRM_RENEWAL_NOT_PAID, and records one on a paid request", () => {
        expect(codeOf(() => subject.assertRecordable("awaiting_payment", "renewed"))).toBe(CrmErrorCode.RenewalNotPaid)
        expect(codeOf(() => subject.assertRecordable("paid", "renewed"))).toBeUndefined()
        expect(codeOf(() => subject.assertRecordable("paid", "failed"))).toBeUndefined()
        expect(codeOf(() => subject.assertRecordable("paid", "pending"))).toBeUndefined()
    })

    it("closes a pending provider answer with renewed or failed, never pends it twice, and never reopens a closed request", () => {
        expect(codeOf(() => subject.assertRecordable("pending_person", "renewed"))).toBeUndefined()
        expect(codeOf(() => subject.assertRecordable("pending_person", "failed"))).toBeUndefined()
        expect(codeOf(() => subject.assertRecordable("pending_person", "pending"))).toBe(
            CrmErrorCode.RenewalStateRefused,
        )
        expect(codeOf(() => subject.assertRecordable("renewed", "failed"))).toBe(CrmErrorCode.RenewalStateRefused)
        expect(codeOf(() => subject.assertRecordable("cancelled", "renewed"))).toBe(CrmErrorCode.RenewalStateRefused)
    })

    it("stores a pending provider answer as waiting for a person", () => {
        const outcomes: ReadonlyArray<RenewalOutcome> = ["renewed", "failed", "pending"]
        expect(outcomes.map((outcome) => subject.stateOfOutcome(outcome))).toEqual([
            "renewed",
            "failed",
            "pending_person",
        ])
    })
})

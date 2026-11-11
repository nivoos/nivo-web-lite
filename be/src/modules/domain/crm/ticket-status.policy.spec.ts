import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { CrmErrorCode } from "./errors/crm.error"
import { assertTicketTransition } from "./ticket-status.policy"

/** The code a call threw, or undefined when it returned. */
const codeOf = (call: () => unknown): string | undefined => {
    try {
        call()
    } catch (error: unknown) {
        return isDomainError(error) ? error.code : "uncoded"
    }
    return undefined
}

const TICKET_STATUS_POLICY: unique symbol = Symbol("ticket-status")

/** The policy under test, resolved through a testing module. */
interface TicketStatusPolicy {
    readonly assertTicketTransition: typeof assertTicketTransition
}

const policy = async (): Promise<TicketStatusPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            { provide: TICKET_STATUS_POLICY, useFactory: (): TicketStatusPolicy => ({ assertTicketTransition }) },
        ],
    }).compile()
    return moduleRef.get<TicketStatusPolicy>(TICKET_STATUS_POLICY)
}

describe("ticket status policy", () => {
    let subject: TicketStatusPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("allows any move but to the same status, and reopens a closed ticket only", () => {
        expect(codeOf(() => subject.assertTicketTransition("open", "resolved"))).toBeUndefined()
        expect(codeOf(() => subject.assertTicketTransition("closed", "open"))).toBeUndefined()
        expect(codeOf(() => subject.assertTicketTransition("closed", "in_progress"))).toBe(
            CrmErrorCode.TicketTransitionRefused,
        )
        expect(codeOf(() => subject.assertTicketTransition("open", "open"))).toBe(CrmErrorCode.TicketTransitionRefused)
    })
})

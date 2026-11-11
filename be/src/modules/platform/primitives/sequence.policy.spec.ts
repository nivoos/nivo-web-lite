import { Test } from "@nestjs/testing"
import { DomainError } from "@modules/platform/errors"
import { eachInOrder } from "./sequence.policy"

/** The refusal a step of the spec throws. */
class SequenceError extends DomainError<"SEQUENCE_STEP_REFUSED"> {}

const SEQUENCE_POLICY: unique symbol = Symbol("sequence")

/** The policy under test, resolved through a testing module. */
interface SequencePolicy {
    readonly eachInOrder: typeof eachInOrder
}

const policy = async (): Promise<SequencePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: SEQUENCE_POLICY, useFactory: (): SequencePolicy => ({ eachInOrder }) }],
    }).compile()
    return moduleRef.get<SequencePolicy>(SEQUENCE_POLICY)
}

describe("sequence policy", () => {
    it("starts each step after the one before settled and answers the results in order", async () => {
        const started: Array<string> = []
        const results = await (
            await policy()
        ).eachInOrder(["a", "b", "c"], async (item) => {
            started.push(`start ${item}`)
            await Promise.resolve()
            started.push(`end ${item}`)
            return item.toUpperCase()
        })
        expect([results, started]).toEqual([
            ["A", "B", "C"],
            ["start a", "end a", "start b", "end b", "start c", "end c"],
        ])
    })

    it("stops at the first rejection", async () => {
        const seen: Array<number> = []
        const run = (await policy()).eachInOrder([1, 2, 3], async (item) => {
            seen.push(item)
            await Promise.resolve()
            if (item === 2) throw new SequenceError({ code: "SEQUENCE_STEP_REFUSED" })
            return item
        })
        await expect(run).rejects.toEqual(expect.objectContaining({ code: "SEQUENCE_STEP_REFUSED" }))
        expect(seen).toEqual([1, 2])
    })
})

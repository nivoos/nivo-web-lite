import { Test } from "@nestjs/testing"
import { factRowsOf, factsById } from "./raw-row.policy"

const RAW_ROW_POLICY: unique symbol = Symbol("raw-row")

/** The policy under test, resolved through a testing module. */
interface RawRowPolicy {
    readonly factRowsOf: typeof factRowsOf
    readonly factsById: typeof factsById
}

const policy = async (): Promise<RawRowPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: RAW_ROW_POLICY, useFactory: (): RawRowPolicy => ({ factRowsOf, factsById }) }],
    }).compile()
    return moduleRef.get<RawRowPolicy>(RAW_ROW_POLICY)
}

const LAST = new Date("2026-11-09T02:00:00.000Z")

describe("raw row policy", () => {
    it("narrows aggregate rows field by field: counts as numbers, instants as dates, texts or null", async () => {
        const subject = await policy()
        expect(
            subject.factRowsOf([
                { id: "a", count: "2", last: LAST, latest: "sent" },
                { id: "b", count: 1, last: "2026-11-09T02:00:00.000Z", latest: 7 },
                { id: "c" },
            ]),
        ).toEqual([
            { id: "a", count: 2, last: LAST, latest: "sent" },
            { id: "b", count: 1, last: LAST, latest: null },
            { id: "c", count: 0, last: null, latest: null },
        ])
    })

    it("drops a row without a text id and answers nothing for a value that is no list", async () => {
        const subject = await policy()
        expect([subject.factRowsOf([{ id: 1 }, "x", null]), subject.factRowsOf("x")]).toEqual([[], []])
    })

    it("indexes fact rows by id", async () => {
        const subject = await policy()
        const row = { id: "a", count: 1, last: null, latest: null }
        expect(subject.factsById([row]).get("a")).toBe(row)
    })
})

import { Test } from "@nestjs/testing"
import { isDomainError } from "@starci/common"
import { PaginationErrorCode } from "./errors/pagination.error"

import { decodeCursor, encodeCursor, pageOf, pageSizeOf } from "./pagination.policy"

/** The code a call threw, or undefined when it returned. */
const codeOf = (call: () => unknown): string | undefined => {
    try {
        call()
    } catch (error: unknown) {
        return isDomainError(error) ? error.code : "uncoded"
    }
    return undefined
}

const PAGINATION_POLICY: unique symbol = Symbol("pagination")

/** The policy under test, resolved through a testing module. */
interface PaginationPolicy {
    readonly decodeCursor: typeof decodeCursor
    readonly encodeCursor: typeof encodeCursor
    readonly pageOf: typeof pageOf
    readonly pageSizeOf: typeof pageSizeOf
}

const policy = async (): Promise<PaginationPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: PAGINATION_POLICY,
                useFactory: (): PaginationPolicy => ({ decodeCursor, encodeCursor, pageOf, pageSizeOf }),
            },
        ],
    }).compile()
    return moduleRef.get<PaginationPolicy>(PAGINATION_POLICY)
}

describe("pagination policy", () => {
    let subject: PaginationPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("round-trips a keyset of its own list", () => {
        expect(subject.decodeCursor("customer.find", subject.encodeCursor("customer.find", ["ACME-1"]), 1)).toEqual([
            "ACME-1",
        ])
    })

    it("answers null for the first page", () => {
        expect(subject.decodeCursor("customer.find", null, 1)).toBeNull()
    })

    it("refuses a cursor of another list, of another width, or not base64 JSON", () => {
        const other = subject.encodeCursor("ticket.list", ["x"])
        expect(codeOf(() => subject.decodeCursor("customer.find", other, 1))).toBe(PaginationErrorCode.CursorInvalid)
        expect(codeOf(() => subject.decodeCursor("ticket.list", other, 2))).toBe(PaginationErrorCode.CursorInvalid)
        expect(codeOf(() => subject.decodeCursor("ticket.list", "%%%", 1))).toBe(PaginationErrorCode.CursorInvalid)
    })

    it("clamps the page size into 1..50 and answers 20 for a size that is no integer", () => {
        expect([
            subject.pageSizeOf(Number.NaN),
            subject.pageSizeOf(0),
            subject.pageSizeOf(500),
            subject.pageSizeOf(7),
        ]).toEqual([20, 1, 50, 7])
    })

    it("cuts limit + 1 rows into a page with a next cursor, and the last page without one", () => {
        const page = subject.pageOf(
            "l",
            ["a", "b", "c"],
            2,
            (row) => [row],
            ["a", "b", "c"].slice(0, 2).map((row) => row.toUpperCase()),
        )
        expect(page.items).toEqual(["A", "B"])
        expect(subject.decodeCursor("l", page.nextCursor, 1)).toEqual(["b"])
        expect(subject.pageOf("l", ["a"], 2, (row) => [row], ["a"].slice(0, 2))).toEqual({
            items: ["a"],
            nextCursor: null,
        })
    })
})

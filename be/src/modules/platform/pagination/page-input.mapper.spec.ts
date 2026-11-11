import { Test } from "@nestjs/testing"
import { toPageInput } from "./page-input.mapper"

const PAGE_INPUT_MAPPER: unique symbol = Symbol("page-input")

/** The mapper under test, resolved through a testing module. */
interface PageInputMapper {
    readonly toPageInput: typeof toPageInput
}

const mapper = async (): Promise<PageInputMapper> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: PAGE_INPUT_MAPPER, useFactory: (): PageInputMapper => ({ toPageInput }) }],
    }).compile()
    return moduleRef.get<PageInputMapper>(PAGE_INPUT_MAPPER)
}

describe("page input mapper", () => {
    it("applies the default size and the first page when the query names neither", async () => {
        expect((await mapper()).toPageInput({})).toEqual({ limit: 20, cursor: null })
    })

    it("passes a named size and cursor through", async () => {
        expect((await mapper()).toPageInput({ limit: 5, cursor: "c" })).toEqual({ limit: 5, cursor: "c" })
    })
})

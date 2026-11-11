import { Test } from "@nestjs/testing"
import { OperatorOutputClient } from "./operator-output.client"

describe("OperatorOutputClient", () => {
    it("shows one line on standard output", async () => {
        const moduleRef = await Test.createTestingModule({ providers: [OperatorOutputClient] }).compile()
        const written: Array<unknown> = []
        const write = jest
            .spyOn(process.stdout, "write")
            .mockImplementation((chunk: unknown) => written.push(chunk) > 0)

        moduleRef.get(OperatorOutputClient).show("one line")

        write.mockRestore()
        expect(written).toEqual(["one line\n"])
    })
})

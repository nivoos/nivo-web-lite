import { Test } from "@nestjs/testing"
import { canonicalJson, sha256Hex } from "./canonical-json.policy"

const CANONICAL_JSON_POLICY: unique symbol = Symbol("canonical-json")

/** The policy under test, resolved through a testing module. */
interface CanonicalJsonPolicy {
    readonly canonicalJson: typeof canonicalJson
    readonly sha256Hex: typeof sha256Hex
}

const policy = async (): Promise<CanonicalJsonPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            { provide: CANONICAL_JSON_POLICY, useFactory: (): CanonicalJsonPolicy => ({ canonicalJson, sha256Hex }) },
        ],
    }).compile()
    return moduleRef.get<CanonicalJsonPolicy>(CANONICAL_JSON_POLICY)
}

describe("canonical json policy", () => {
    let subject: CanonicalJsonPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("sorts keys at every level, keeps array order, drops undefined members and ends with one newline", () => {
        expect(subject.canonicalJson({ b: [2, { d: 1, c: undefined }], a: 1 })).toBe(
            '{\n  "a": 1,\n  "b": [\n    2,\n    {\n      "d": 1\n    }\n  ]\n}\n',
        )
    })

    it("hashes a text as lower-case hex sha256", () => {
        expect(subject.sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    })
})

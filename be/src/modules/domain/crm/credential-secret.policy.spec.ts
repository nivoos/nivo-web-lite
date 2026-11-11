import { Test } from "@nestjs/testing"
import { SYNTHETIC_SECRET, uuid } from "@tests/fixtures/builders/crm.builder"
import { bearerOf, presentedOf, sameSecret, secretSha256Of } from "./credential-secret.policy"

const CREDENTIAL_SECRET_POLICY: unique symbol = Symbol("credential-secret")

/** The policy under test, resolved through a testing module. */
interface CredentialSecretPolicy {
    readonly bearerOf: typeof bearerOf
    readonly presentedOf: typeof presentedOf
    readonly sameSecret: typeof sameSecret
    readonly secretSha256Of: typeof secretSha256Of
}

const policy = async (): Promise<CredentialSecretPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: CREDENTIAL_SECRET_POLICY,
                useFactory: (): CredentialSecretPolicy => ({ bearerOf, presentedOf, sameSecret, secretSha256Of }),
            },
        ],
    }).compile()
    return moduleRef.get<CredentialSecretPolicy>(CREDENTIAL_SECRET_POLICY)
}

const ID = uuid(111)
const STORED = "d64b93c9f1b60eb338e5cb415d6a36bd920edd0e9b36f7ea5c730d0e10ff147f"

describe("credential secret policy: the bearer", () => {
    it("splits `Bearer <id>.<secret>` with any case of the scheme, and refuses any other shape", async () => {
        const subject = await policy()
        const bearer = subject.bearerOf(ID, SYNTHETIC_SECRET)
        expect([subject.presentedOf(`Bearer ${bearer}`), subject.presentedOf(`BEARER ${bearer}`)]).toEqual([
            { id: ID, secret: SYNTHETIC_SECRET },
            { id: ID, secret: SYNTHETIC_SECRET },
        ])
        expect([
            subject.presentedOf(`Bearer ${bearer} extra`),
            subject.presentedOf(`Token ${bearer}`),
            subject.presentedOf("Bearer"),
            subject.presentedOf(`Bearer ${ID}.short`),
            subject.presentedOf(`Bearer not-a-uuid.${SYNTHETIC_SECRET}`),
        ]).toEqual([null, null, null, null, null])
    })
})

describe("credential secret policy: the compare", () => {
    it("stores the hex sha256 and compares 32-byte digests (timingSafeEqual), refusing another secret or a malformed digest", async () => {
        const subject = await policy()
        expect(subject.secretSha256Of(SYNTHETIC_SECRET)).toBe(STORED)
        expect([
            subject.sameSecret(SYNTHETIC_SECRET, STORED),
            subject.sameSecret("x".repeat(43), STORED),
            subject.sameSecret(SYNTHETIC_SECRET, "abc"),
        ]).toEqual([true, false, false])
    })
})

import { Test } from "@nestjs/testing"
import { paymentCodeOf, priceOf, priceTable } from "./price.policy"

const PRICE_POLICY: unique symbol = Symbol("price")

/** The policy under test, resolved through a testing module. */
interface PricePolicy {
    readonly paymentCodeOf: typeof paymentCodeOf
    readonly priceOf: typeof priceOf
    readonly priceTable: typeof priceTable
}

const policy = async (): Promise<PricePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: PRICE_POLICY, useFactory: (): PricePolicy => ({ paymentCodeOf, priceOf, priceTable }) }],
    }).compile()
    return moduleRef.get<PricePolicy>(PRICE_POLICY)
}

describe("price policy (placeholder table)", () => {
    let subject: PricePolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("prices a class and term with 10 percent VAT, labelled placeholder", () => {
        expect(subject.priceOf("hosting", 24)).toEqual({
            serviceClass: "hosting",
            termMonths: 24,
            netVnd: 2_400_000,
            vatRatePercent: 10,
            vatVnd: 240_000,
            totalVnd: 2_640_000,
            priceSource: "placeholder",
        })
    })

    it("has no price for a term the table does not carry", () => {
        expect([subject.priceOf("domain", 6), subject.priceOf("hosting", 48)]).toEqual([null, null])
    })

    it("lists nine prices ordered by class then term", () => {
        expect(subject.priceTable().map((price) => `${price.serviceClass}:${price.termMonths}`)).toEqual([
            "domain:12",
            "domain:24",
            "domain:36",
            "hosting:12",
            "hosting:24",
            "hosting:36",
            "ssl:12",
            "ssl:24",
            "ssl:36",
        ])
    })

    it("derives a stable transfer code without look-alike characters", () => {
        const code = subject.paymentCodeOf("00000000-0000-4000-8000-000000000001")
        expect(code).toMatch(/^GH[A-HJ-NP-Z2-9]{8}$/u)
        expect(subject.paymentCodeOf("00000000-0000-4000-8000-000000000001")).toBe(code)
        expect(subject.paymentCodeOf("00000000-0000-4000-8000-000000000002")).not.toBe(code)
    })
})

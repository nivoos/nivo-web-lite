import { Test } from "@nestjs/testing"
import { paymentCodeOf, priceOf, priceRows } from "./price.policy"

const PRICE_POLICY: unique symbol = Symbol("price")

/** The policy under test, resolved through a testing module. */
interface PricePolicy {
    readonly paymentCodeOf: typeof paymentCodeOf
    readonly priceOf: typeof priceOf
    readonly priceRows: typeof priceRows
}

const policy = async (): Promise<PricePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [{ provide: PRICE_POLICY, useFactory: (): PricePolicy => ({ paymentCodeOf, priceOf, priceRows }) }],
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

    it("lists a NEW website build and, per class and term, a NEW and a renewal row, by price code, all placeholder", () => {
        const rows = subject.priceRows()
        expect([rows.length, rows[0]?.priceCode, rows.every((row) => row.priceSource === "placeholder")]).toEqual([
            19,
            "new-domain-12",
            true,
        ])
        expect(rows.find((row) => row.priceCode === "new-website")).toEqual(
            expect.objectContaining({
                kind: "new",
                termMonths: null,
                setupVnd: 6_000_000,
                vatVnd: 600_000,
                totalVnd: 6_600_000,
                instalmentPercents: [50, 50],
            }),
        )
        expect(rows.find((row) => row.priceCode === "renewal-hosting-24")).toEqual(
            expect.objectContaining({
                kind: "renewal",
                netVnd: 2_400_000,
                totalVnd: 2_640_000,
                instalmentPercents: [100],
            }),
        )
    })

    it("derives a stable transfer code without look-alike characters", () => {
        const code = subject.paymentCodeOf("00000000-0000-4000-8000-000000000001", "GH")
        expect(code).toMatch(/^GH[A-HJ-NP-Z2-9]{8}$/u)
        expect(subject.paymentCodeOf("00000000-0000-4000-8000-000000000001", "GH")).toBe(code)
        expect(subject.paymentCodeOf("00000000-0000-4000-8000-000000000002", "GH")).not.toBe(code)
    })
})

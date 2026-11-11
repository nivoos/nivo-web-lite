import { Test } from "@nestjs/testing"
import { FIXTURE_NOTE, FixtureRenewalClient } from "./fixture-renewal.client"

const FACTS = { serviceCode: "SYN-HOST", provider: "inet", expiresOn: "2026-12-01", today: "2026-11-12" }
const RENEWAL_ID = "abcdef12-0000-4000-8000-000000000001"

const build = async (): Promise<FixtureRenewalClient> => {
    const moduleRef = await Test.createTestingModule({ providers: [FixtureRenewalClient] }).compile()
    return moduleRef.get(FixtureRenewalClient)
}

describe("FixtureRenewalClient", () => {
    it("answers the state the CRM's own end date implies, labelled as a fixture", async () => {
        const fixture = await build()
        await expect(fixture.status(FACTS)).resolves.toEqual({
            plugin: "fixture",
            state: "active",
            expiresOn: "2026-12-01",
            checkedBy: "fixture",
            note: FIXTURE_NOTE,
        })
        await expect(fixture.status({ ...FACTS, expiresOn: "2026-11-01" })).resolves.toEqual(
            expect.objectContaining({ state: "expired" }),
        )
        await expect(fixture.status({ ...FACTS, expiresOn: null })).resolves.toEqual(
            expect.objectContaining({ state: "unknown" }),
        )
    })

    it("renews from the later of the end date and today, without calling out (always dry)", async () => {
        const fixture = await build()
        await expect(
            fixture.renew({ ...FACTS, renewalId: RENEWAL_ID, termMonths: 12, dryRun: false }),
        ).resolves.toEqual({
            plugin: "fixture",
            state: "renewed",
            providerRef: "FIXTURE-ABCDEF12",
            newExpiresOn: "2027-12-01",
            dryRun: true,
        })
        await expect(
            fixture.renew({ ...FACTS, expiresOn: "2026-10-01", renewalId: RENEWAL_ID, termMonths: 12, dryRun: true }),
        ).resolves.toEqual(expect.objectContaining({ newExpiresOn: "2027-11-12" }))
        await expect(
            fixture.renew({ ...FACTS, expiresOn: null, renewalId: RENEWAL_ID, termMonths: 24, dryRun: true }),
        ).resolves.toEqual(expect.objectContaining({ newExpiresOn: "2028-11-12" }))
    })
})

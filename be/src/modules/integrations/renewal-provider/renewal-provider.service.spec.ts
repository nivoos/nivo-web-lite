import { Test } from "@nestjs/testing"
import { ManualRenewalClient } from "./manual-renewal.client"
import { FIXTURE_NOTE, FixtureRenewalClient } from "./fixture-renewal.client"
import { RENEWAL_PROVIDER_OPTIONS } from "./renewal-provider.decorators"
import { RenewalProviderService } from "./renewal-provider.service"

const FACTS = { serviceCode: "SYN-HOST", provider: "inet", expiresOn: "2026-12-01", today: "2026-11-12" }

const build = async () => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            RenewalProviderService,
            ManualRenewalClient,
            FixtureRenewalClient,
            {
                provide: RENEWAL_PROVIDER_OPTIONS,
                useValue: { plugins: { inet: "fixture", tino: "fixture", azwebsite: "manual" } },
            },
        ],
    }).compile()
    return moduleRef.get(RenewalProviderService)
}

describe("RenewalProviderService", () => {
    it("routes iNET and Tino to the fixture plugin, AZ, manual, unknown and null to manual by default", async () => {
        const router = await build()
        expect(
            ["inet", "tino", "azwebsite", "manual", "other", null].map((provider) => router.pluginFor(provider).name),
        ).toEqual(["fixture", "fixture", "manual", "manual", "manual", "manual"])
    })

    it("the manual plugin answers unknown and leaves the renewal to a person", async () => {
        const manual = (await build()).pluginFor(null)
        await expect(manual.status(FACTS)).resolves.toEqual(
            expect.objectContaining({ state: "unknown", checkedBy: "person" }),
        )
        await expect(
            manual.renew({
                ...FACTS,
                renewalId: "00000000-0000-4000-8000-000000000001",
                termMonths: 12,
                dryRun: false,
            }),
        ).resolves.toEqual({
            plugin: "manual",
            state: "pending_person",
            providerRef: null,
            newExpiresOn: null,
            dryRun: false,
        })
    })

    it("the fixture plugin answers from the row, labelled, and renews from the later of end date and today without calling out", async () => {
        const fixture = (await build()).pluginFor("inet")
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
        await expect(
            fixture.renew({
                ...FACTS,
                renewalId: "abcdef12-0000-4000-8000-000000000001",
                termMonths: 12,
                dryRun: false,
            }),
        ).resolves.toEqual({
            plugin: "fixture",
            state: "renewed",
            providerRef: "FIXTURE-ABCDEF12",
            newExpiresOn: "2027-12-01",
            dryRun: true,
        })
        await expect(
            fixture.renew({
                ...FACTS,
                expiresOn: "2026-10-01",
                renewalId: "abcdef12-0000-4000-8000-000000000001",
                termMonths: 12,
                dryRun: true,
            }),
        ).resolves.toEqual(expect.objectContaining({ newExpiresOn: "2027-11-12" }))
    })
})

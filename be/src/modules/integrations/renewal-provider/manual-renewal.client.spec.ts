import { Test } from "@nestjs/testing"
import { ManualRenewalClient } from "./manual-renewal.client"

const FACTS = { serviceCode: "SYN-HOST", provider: "azwebsite", expiresOn: "2026-12-01", today: "2026-11-12" }

const build = async (): Promise<ManualRenewalClient> => {
    const moduleRef = await Test.createTestingModule({ providers: [ManualRenewalClient] }).compile()
    return moduleRef.get(ManualRenewalClient)
}

describe("ManualRenewalClient", () => {
    it("answers that a person checks the state at the provider", async () => {
        await expect((await build()).status(FACTS)).resolves.toEqual({
            plugin: "manual",
            state: "unknown",
            expiresOn: null,
            checkedBy: "person",
            note: "manual: a person checks at the provider",
        })
    })

    it("leaves the renewal to a person, keeping the caller's dry-run flag", async () => {
        const request = { ...FACTS, renewalId: "00000000-0000-4000-8000-000000000001", termMonths: 12, dryRun: false }
        await expect((await build()).renew(request)).resolves.toEqual({
            plugin: "manual",
            state: "pending_person",
            providerRef: null,
            newExpiresOn: null,
            dryRun: false,
        })
    })
})

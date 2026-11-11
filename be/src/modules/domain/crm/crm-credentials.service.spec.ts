import { Test } from "@nestjs/testing"
import { FakeClock, type MockEntityManager, fakeIds, mock, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { IDS } from "@modules/platform/ids"
import { LOGGER, type Logger } from "@modules/platform/logging"
import { isRecord } from "@modules/platform/primitives"
import { WS } from "@tests/fixtures/builders/crm.builder"
import { presentedOf, sameSecret } from "./credential-secret.policy"
import { CrmCredentialsService } from "./crm-credentials.service"
import { CrmErrorCode } from "./errors/crm.error"
import { OperatorOutputClient } from "./operator-output.client"
import { ServiceCredentialEntity } from "./persistence/entities"

const NOW = "2026-11-12T03:00:00.000Z"

const build = async (em: MockEntityManager) => {
    const logger = mock<Logger>()
    const output = mock<OperatorOutputClient>()
    const ids = fakeIds()
    const moduleRef = await Test.createTestingModule({
        providers: [
            CrmCredentialsService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: ids },
            { provide: LOGGER, useValue: logger },
            { provide: OperatorOutputClient, useValue: output },
        ],
    }).compile()
    return { credentials: moduleRef.get(CrmCredentialsService), logger, output }
}

describe("CrmCredentialsService.issue", () => {
    it("stores only the sha256 of a fresh secret and shows the bearer once to the operator, never in a log line", async () => {
        const em = mockEntityManager({
            insert: [ServiceCredentialEntity, { identifiers: [], generatedMaps: [], raw: [] }],
        })
        const { credentials, logger, output } = await build(em)

        const id = await credentials.issue({ workspaceId: WS.toUpperCase(), label: "  NIVO Web  " })

        const shown = String(output.show.mock.calls[0]?.[0])
        const presented = presentedOf(`Bearer ${shown}`)
        const stored: unknown = em.insert.mock.calls[0]?.[1]
        const storedSha256 = isRecord(stored) ? String(stored["secretSha256"]) : ""
        expect(stored).toEqual({
            id,
            workspaceId: WS,
            label: "NIVO Web",
            secretSha256: storedSha256,
            revokedAt: null,
        })
        expect(storedSha256).toMatch(/^[0-9a-f]{64}$/u)
        expect([presented?.id, sameSecret(presented?.secret ?? "", storedSha256)]).toEqual([id, true])
        expect(output.show.mock.calls).toHaveLength(1)
        expect(logger.info.mock.calls).toEqual([["crm.credential.issued", { credentialId: id, workspaceId: WS }]])
        expect(JSON.stringify(logger.info.mock.calls)).not.toContain(presented?.secret)
    })

    it("refuses a workspace that is no uuid and an empty or long label, storing nothing", async () => {
        const em = mockEntityManager()
        const { credentials } = await build(em)
        await expect(credentials.issue({ workspaceId: "acme", label: "x" })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.CredentialWorkspaceInvalid }),
        )
        await expect(credentials.issue({ workspaceId: WS, label: " " })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.CredentialLabelInvalid }),
        )
        await expect(credentials.issue({ workspaceId: WS, label: "x".repeat(121) })).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.CredentialLabelInvalid }),
        )
        expect(em.insert).not.toHaveBeenCalled()
    })
})

describe("CrmCredentialsService.revoke", () => {
    it("stamps a live credential revoked now", async () => {
        const em = mockEntityManager({ update: [ServiceCredentialEntity, { affected: 1, raw: [], generatedMaps: [] }] })
        const { credentials, logger } = await build(em)

        await expect(credentials.revoke("00000000-0000-4000-8000-0000000000AA")).resolves.toBeUndefined()

        expect(em.update.mock.calls[0]?.[2]).toEqual({ revokedAt: new Date(NOW) })
        expect(logger.info.mock.calls).toEqual([
            ["crm.credential.revoked", { credentialId: "00000000-0000-4000-8000-0000000000aa" }],
        ])
    })

    it("refuses an unknown or already revoked credential", async () => {
        const em = mockEntityManager({ update: [ServiceCredentialEntity, { affected: 0, raw: [], generatedMaps: [] }] })
        await expect((await build(em)).credentials.revoke("00000000-0000-4000-8000-0000000000aa")).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.CredentialNotFound }),
        )
    })
})

import { Test } from "@nestjs/testing"
import { IsNull } from "typeorm"
import { FakeClock, type MockEntityManager, fakeIds, mock, mockEntityManager } from "@starci/jest-preset"
import { CLOCK } from "@modules/platform/clock"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { IDS } from "@modules/platform/ids"
import { LOGGER, type Logger } from "@modules/platform/logging"
import { isRecord } from "@modules/platform/primitives"
import { SYNTHETIC_SECRET, WS, serviceCredentialRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { CRM_OPERATION_IDS, OTHER_WS } from "@tests/fixtures/builders/workspace-scope.builder"
import { presentedOf, sameSecret } from "./credential-secret.policy"
import { CrmCredentialService } from "./crm-credential.service"
import { CrmErrorCode } from "./errors/crm.error"
import { OperatorOutputClient } from "./operator-output.client"
import { ServiceCredentialEntity } from "./persistence/entities"

const API_KEY = { kind: "api-key" } as const
const ID = uuid(111)

const NOW = "2026-11-12T03:00:00.000Z"

const setup = async (em: MockEntityManager) => {
    const logger = mock<Logger>()
    const output = mock<OperatorOutputClient>()
    const moduleRef = await Test.createTestingModule({
        providers: [
            CrmCredentialService,
            { provide: PRIMARY_ENTITY_MANAGER, useValue: em },
            { provide: CLOCK, useValue: new FakeClock(NOW) },
            { provide: IDS, useValue: fakeIds() },
            { provide: LOGGER, useValue: logger },
            { provide: OperatorOutputClient, useValue: output },
        ],
    }).compile()
    return { credentials: moduleRef.get(CrmCredentialService), logger, output }
}

const build = async (em: MockEntityManager): Promise<CrmCredentialService> => (await setup(em)).credentials

const refused: unknown = expect.objectContaining({ code: CrmErrorCode.ServiceKeyRejected })

describe("CrmCredentialService: a live credential", () => {
    it("admits its bearer and acts for the credential's own workspace, named by id, looked up live only", async () => {
        const em = mockEntityManager({ findOne: [ServiceCredentialEntity, serviceCredentialRow()] })

        await expect((await build(em)).authenticate(API_KEY, `bearer ${ID}.${SYNTHETIC_SECRET}`)).resolves.toEqual({
            kind: "api-key",
            subject: `crm-credential:${ID}`,
            workspaceId: WS,
        })
        expect(em.findOne).toHaveBeenCalledWith(ServiceCredentialEntity, { where: { id: ID, revokedAt: IsNull() } })
    })

    it("acts for the other workspace when that workspace's credential is presented: two workspaces, two credentials", async () => {
        const em = mockEntityManager({
            findOne: [ServiceCredentialEntity, serviceCredentialRow({ id: uuid(112), workspaceId: OTHER_WS })],
        })

        await expect(
            (await build(em)).authenticate(API_KEY, `Bearer ${uuid(112)}.${SYNTHETIC_SECRET}`),
        ).resolves.toEqual({ kind: "api-key", subject: `crm-credential:${uuid(112)}`, workspaceId: OTHER_WS })
    })

    it("is the workspace source of all 29 operations, each listed once in the scope tables of the service specs", () => {
        expect([CRM_OPERATION_IDS.length, new Set(CRM_OPERATION_IDS).size]).toEqual([29, 29])
    })
})

describe("CrmCredentialService: refusals", () => {
    it("refuses a wrong secret and a revoked or unknown credential (the live lookup answers nothing)", async () => {
        const wrong = mockEntityManager({ findOne: [ServiceCredentialEntity, serviceCredentialRow()] })
        await expect((await build(wrong)).authenticate(API_KEY, `Bearer ${ID}.${"x".repeat(43)}`)).rejects.toEqual(
            refused,
        )
        const revoked = mockEntityManager({ findOne: [ServiceCredentialEntity, null] })
        await expect((await build(revoked)).authenticate(API_KEY, `Bearer ${ID}.${SYNTHETIC_SECRET}`)).rejects.toEqual(
            refused,
        )
    })

    it("refuses a malformed header and another credential kind without reading the store", async () => {
        const em = mockEntityManager()
        const service = await build(em)
        await expect(service.authenticate(API_KEY, `Basic ${ID}.${SYNTHETIC_SECRET}`)).rejects.toEqual(refused)
        await expect(service.authenticate(API_KEY, SYNTHETIC_SECRET)).rejects.toEqual(refused)
        await expect(service.authenticate({ kind: "run-token" }, `Bearer ${ID}.${SYNTHETIC_SECRET}`)).rejects.toEqual(
            refused,
        )
        expect(em.findOne).not.toHaveBeenCalled()
    })
})

describe("CrmCredentialService.issue", () => {
    it("stores only the sha256 of a fresh secret and shows the bearer once to the operator, never in a log line", async () => {
        const em = mockEntityManager({
            insert: [ServiceCredentialEntity, { identifiers: [], generatedMaps: [], raw: [] }],
        })
        const { credentials, logger, output } = await setup(em)

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
        const { credentials } = await setup(em)
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

describe("CrmCredentialService.revoke", () => {
    it("stamps a live credential revoked now", async () => {
        const em = mockEntityManager({ update: [ServiceCredentialEntity, { affected: 1, raw: [], generatedMaps: [] }] })
        const { credentials, logger } = await setup(em)

        await expect(credentials.revoke("00000000-0000-4000-8000-0000000000AA")).resolves.toBeUndefined()

        expect(em.update.mock.calls[0]?.[2]).toEqual({ revokedAt: new Date(NOW) })
        expect(logger.info.mock.calls).toEqual([
            ["crm.credential.revoked", { credentialId: "00000000-0000-4000-8000-0000000000aa" }],
        ])
    })

    it("refuses an unknown or already revoked credential", async () => {
        const em = mockEntityManager({ update: [ServiceCredentialEntity, { affected: 0, raw: [], generatedMaps: [] }] })
        await expect((await setup(em)).credentials.revoke("00000000-0000-4000-8000-0000000000aa")).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.CredentialNotFound }),
        )
    })
})

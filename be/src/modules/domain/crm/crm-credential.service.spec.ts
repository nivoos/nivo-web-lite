import { Test } from "@nestjs/testing"
import { IsNull } from "typeorm"
import { type MockEntityManager, mockEntityManager } from "@starci/jest-preset"
import { PRIMARY_ENTITY_MANAGER } from "@modules/platform/database"
import { SYNTHETIC_SECRET, WS, serviceCredentialRow, uuid } from "@tests/fixtures/builders/crm.builder"
import { CRM_OPERATION_IDS, OTHER_WS } from "@tests/fixtures/builders/workspace-scope.builder"
import { CrmCredentialService } from "./crm-credential.service"
import { CrmErrorCode } from "./errors/crm.error"
import { ServiceCredentialEntity } from "./persistence/entities"

const API_KEY = { kind: "api-key" } as const
const ID = uuid(111)

const build = async (em: MockEntityManager): Promise<CrmCredentialService> => {
    const moduleRef = await Test.createTestingModule({
        providers: [CrmCredentialService, { provide: PRIMARY_ENTITY_MANAGER, useValue: em }],
    }).compile()
    return moduleRef.get(CrmCredentialService)
}

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

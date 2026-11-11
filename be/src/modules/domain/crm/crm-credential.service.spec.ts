import { Test } from "@nestjs/testing"
import { builder } from "@starci/jest-preset"
import { Secret } from "@modules/platform/config"
import { CRM_OPTIONS } from "./crm.decorators"
import { CrmCredentialService } from "./crm-credential.service"
import type { CrmOptions } from "./crm.options"
import { CrmErrorCode } from "./errors/crm.error"

const KEY = "synthetic-service-key-for-specs"
const WS = "6f1c2a9e-0000-4000-8000-00000000a001"
const API_KEY = { kind: "api-key" } as const

const WITH_KEY: CrmOptions = builder<CrmOptions>({ credential: { serviceKey: new Secret(KEY), workspaceId: WS } })()
const WITHOUT_KEY: CrmOptions = builder<CrmOptions>({})()

const withKey = async (): Promise<CrmCredentialService> => {
    const moduleRef = await Test.createTestingModule({
        providers: [CrmCredentialService, { provide: CRM_OPTIONS, useValue: WITH_KEY }],
    }).compile()
    return moduleRef.get(CrmCredentialService)
}

const withoutKey = async (): Promise<CrmCredentialService> => {
    const moduleRef = await Test.createTestingModule({
        providers: [CrmCredentialService, { provide: CRM_OPTIONS, useValue: WITHOUT_KEY }],
    }).compile()
    return moduleRef.get(CrmCredentialService)
}

describe("CrmCredentialService", () => {
    it("admits the sealed key as a bearer credential acting for its one workspace, named by the credential's NAME", async () => {
        await expect((await withKey()).authenticate(API_KEY, `Bearer ${KEY}`)).resolves.toEqual({
            kind: "api-key",
            subject: "CRM_SERVICE_KEY",
            workspaceId: WS,
        })
    })

    it("refuses another key, another scheme, extra words, an empty header and another credential kind", async () => {
        const service = await withKey()
        for (const [metadata, authorization] of [
            [API_KEY, `Bearer ${KEY}x`],
            [API_KEY, `Basic ${KEY}`],
            [API_KEY, `Bearer ${KEY} more`],
            [API_KEY, ""],
            [{ kind: "run-token" } as const, `Bearer ${KEY}`],
        ] as const) {
            await expect(service.authenticate(metadata, authorization)).rejects.toEqual(
                expect.objectContaining({ code: CrmErrorCode.ServiceKeyRejected }),
            )
        }
    })

    it("refuses every key when the capability was composed without a credential (the cli)", async () => {
        await expect((await withoutKey()).authenticate(API_KEY, `Bearer ${KEY}`)).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ServiceKeyRejected }),
        )
    })
})

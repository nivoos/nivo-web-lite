import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmCredentialService } from "@modules/domain/crm"
import { CredentialRevokeCli } from "./revoke.cli"

describe("CredentialRevokeCli", () => {
    it("hands --id to the credentials service once and answers nothing itself", async () => {
        const credentials = mock<CrmCredentialService>()
        credentials.revoke.mockResolvedValue()
        const moduleRef = await Test.createTestingModule({
            providers: [CredentialRevokeCli, { provide: CrmCredentialService, useValue: credentials }],
        }).compile()
        const command = moduleRef.get(CredentialRevokeCli)

        await expect(command.run([], { id: command.parseId("credential-1") })).resolves.toBeUndefined()

        expect(credentials.revoke.mock.calls).toEqual([["credential-1"]])
    })
})

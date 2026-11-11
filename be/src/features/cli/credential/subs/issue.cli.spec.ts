import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmCredentialService } from "@modules/domain/crm"
import { CredentialIssueCli } from "./issue.cli"

describe("CredentialIssueCli", () => {
    it("hands --workspace and --label to the credentials service once and answers nothing itself", async () => {
        const credentials = mock<CrmCredentialService>()
        credentials.issue.mockResolvedValue("credential-1")
        const moduleRef = await Test.createTestingModule({
            providers: [CredentialIssueCli, { provide: CrmCredentialService, useValue: credentials }],
        }).compile()
        const command = moduleRef.get(CredentialIssueCli)

        await expect(
            command.run([], { workspace: command.parseWorkspace("ws-1"), label: command.parseLabel("NIVO Web") }),
        ).resolves.toBeUndefined()

        expect(credentials.issue.mock.calls).toEqual([[{ workspaceId: "ws-1", label: "NIVO Web" }]])
    })
})

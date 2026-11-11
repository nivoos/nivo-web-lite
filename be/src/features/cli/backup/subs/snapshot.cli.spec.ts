import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmImportService } from "@modules/domain/crm"
import { BackupSnapshotCli } from "./snapshot.cli"

describe("BackupSnapshotCli", () => {
    it("hands --out and --workspace to the import service's format @1 export once and answers nothing itself", async () => {
        const importer = mock<CrmImportService>()
        importer.exportSnapshot.mockResolvedValue({ entities: [] })
        const moduleRef = await Test.createTestingModule({
            providers: [BackupSnapshotCli, { provide: CrmImportService, useValue: importer }],
        }).compile()
        const command = moduleRef.get(BackupSnapshotCli)

        await expect(
            command.run([], { out: command.parseOut("repo"), workspace: command.parseWorkspace("ws-1") }),
        ).resolves.toBeUndefined()

        expect(importer.exportSnapshot.mock.calls).toEqual([[{ out: "repo", workspaceId: "ws-1" }]])
    })
})

import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmImportService } from "@modules/domain/crm"
import { ImportSnapshotCli } from "./snapshot.cli"

const build = async () => {
    const importer = mock<CrmImportService>()
    importer.import.mockResolvedValue({ executed: false, entities: [] })
    const moduleRef = await Test.createTestingModule({
        providers: [ImportSnapshotCli, { provide: CrmImportService, useValue: importer }],
    }).compile()
    return { command: moduleRef.get(ImportSnapshotCli), importer }
}

describe("ImportSnapshotCli", () => {
    it("hands --from and --workspace to the import service, dry unless --execute is given", async () => {
        const { command, importer } = await build()
        const from = command.parseFrom("snap")
        const workspace = command.parseWorkspace("ws-1")

        await expect(command.run([], { from, workspace })).resolves.toBeUndefined()
        await expect(command.run([], { from, workspace, execute: command.parseExecute() })).resolves.toBeUndefined()

        expect(importer.import.mock.calls).toEqual([
            [{ from: "snap", workspaceId: "ws-1", execute: undefined }],
            [{ from: "snap", workspaceId: "ws-1", execute: true }],
        ])
    })
})

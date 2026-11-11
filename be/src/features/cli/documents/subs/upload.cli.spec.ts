import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmImportService } from "@modules/domain/crm"
import { DocumentsUploadCli } from "./upload.cli"

describe("DocumentsUploadCli", () => {
    it("hands --from and --workspace to the import service, dry unless --execute is given", async () => {
        const importer = mock<CrmImportService>()
        const moduleRef = await Test.createTestingModule({
            providers: [DocumentsUploadCli, { provide: CrmImportService, useValue: importer }],
        }).compile()
        const command = moduleRef.get(DocumentsUploadCli)
        const from = command.parseFrom("originals")
        const workspace = command.parseWorkspace("ws-1")

        await expect(command.run([], { from, workspace })).resolves.toBeUndefined()
        await expect(command.run([], { from, workspace, execute: command.parseExecute() })).resolves.toBeUndefined()

        expect(importer.uploadDocuments.mock.calls).toEqual([
            [{ from: "originals", workspaceId: "ws-1", execute: undefined }],
            [{ from: "originals", workspaceId: "ws-1", execute: true }],
        ])
    })
})

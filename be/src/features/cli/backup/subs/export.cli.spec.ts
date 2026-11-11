import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmBackupService } from "@modules/domain/crm-backup"
import { BackupExportCli } from "./export.cli"

describe("BackupExportCli", () => {
    it("hands --out to the backup service once and answers nothing itself", async () => {
        const backup = mock<CrmBackupService>()
        backup.export.mockResolvedValue({ tables: 23, rows: 7 })
        const moduleRef = await Test.createTestingModule({
            providers: [BackupExportCli, { provide: CrmBackupService, useValue: backup }],
        }).compile()
        const command = moduleRef.get(BackupExportCli)

        await expect(command.run([], { out: command.parseOut("dir") })).resolves.toBeUndefined()

        expect(backup.export.mock.calls).toEqual([["dir"]])
    })
})

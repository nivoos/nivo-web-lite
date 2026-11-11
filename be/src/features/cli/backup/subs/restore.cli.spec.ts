import { Test } from "@nestjs/testing"
import { mock } from "@starci/jest-preset"
import { CrmBackupService } from "@modules/domain/crm-backup"
import { BackupRestoreCli } from "./restore.cli"

describe("BackupRestoreCli", () => {
    it("hands --from to the backup service once and answers nothing itself", async () => {
        const backup = mock<CrmBackupService>()
        backup.restore.mockResolvedValue({ tables: 23, rows: 7 })
        const moduleRef = await Test.createTestingModule({
            providers: [BackupRestoreCli, { provide: CrmBackupService, useValue: backup }],
        }).compile()
        const command = moduleRef.get(BackupRestoreCli)

        await expect(command.run([], { from: command.parseFrom("dir") })).resolves.toBeUndefined()

        expect(backup.restore.mock.calls).toEqual([["dir"]])
    })
})

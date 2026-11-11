import { Command, CommandRunner } from "nest-commander"
import { BackupExportCli } from "./subs/export.cli"
import { BackupRestoreCli } from "./subs/restore.cli"
import { BackupSnapshotCli } from "./subs/snapshot.cli"

@Command({
    name: "backup",
    description:
        "The backups of the CRM: the data repository's format @1 (snapshot) and the table-shaped fast restore (export, restore)",
    subCommands: [BackupExportCli, BackupRestoreCli, BackupSnapshotCli],
})
/** `cli backup`: the backup group; its commands are the sub-commands (`cli backup snapshot`, `cli backup export`, `cli backup restore`). */
export class BackupCli extends CommandRunner {
    /** Without a sub-command the group shows its help. */
    run(): Promise<void> {
        return this.command.help()
    }
}

import { Command, CommandRunner } from "nest-commander"
import { BackupExportCli } from "./subs/export.cli"
import { BackupRestoreCli } from "./subs/restore.cli"

@Command({
    name: "backup",
    description: "The table-shaped backup of the CRM (export, restore)",
    subCommands: [BackupExportCli, BackupRestoreCli],
})
/** `cli backup`: the backup group; its commands are the sub-commands (`cli backup export`, `cli backup restore`). */
export class BackupCli extends CommandRunner {
    /** Without a sub-command the group shows its help. */
    run(): Promise<void> {
        return this.command.help()
    }
}

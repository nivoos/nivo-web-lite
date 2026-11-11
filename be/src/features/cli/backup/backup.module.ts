import { Module } from "@nestjs/common"
import { BackupCli } from "./backup.cli"
import { ConfigurableModuleClass } from "./backup.module-definition"
import { BackupExportCli } from "./subs/export.cli"
import { BackupRestoreCli } from "./subs/restore.cli"

@Module({ providers: [BackupCli, BackupExportCli, BackupRestoreCli] })
/** The backup group: its command and its sub-commands; the work is the runner service the sub-command delegates to. */
export class BackupModule extends ConfigurableModuleClass {}

import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmBackupService } from "@modules/domain/crm-backup"

/** The options of `cli backup restore`. */
export interface BackupRestoreOptions {
    /** The backup directory to read (`--from <dir>`). */
    readonly from: string
}

@SubCommand({ name: "restore", description: "Restore a backup directory (format @2) into an empty database" })
/** `cli backup restore --from <dir>`: delegates to the CRM backup service ; the service logs the counts. */
export class BackupRestoreCli extends CommandRunner {
    constructor(private readonly backup: CrmBackupService) {
        super()
    }

    /** `--from <dir>`: the backup directory. */
    @Option({ flags: "--from <dir>", description: "The backup directory", required: true })
    parseFrom(value: string): string {
        return value
    }

    /** Restores through the backup service. */
    async run(_passed: Array<string>, options: BackupRestoreOptions): Promise<void> {
        await this.backup.restore(options.from)
    }
}

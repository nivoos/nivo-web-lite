import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmBackupService } from "@modules/domain/crm-backup"

/** The options of `cli backup export`. */
export interface BackupExportOptions {
    /** The backup directory to write (`--out <dir>`). */
    readonly out: string
}

@SubCommand({ name: "export", description: "Write every CRM table and a manifest to a backup directory (format @2)" })
/** `cli backup export --out <dir>`: delegates to the CRM backup service ; the service logs the counts. */
export class BackupExportCli extends CommandRunner {
    constructor(private readonly backup: CrmBackupService) {
        super()
    }

    /** `--out <dir>`: the backup directory. */
    @Option({ flags: "--out <dir>", description: "The backup directory", required: true })
    parseOut(value: string): string {
        return value
    }

    /** Exports through the backup service. */
    async run(_passed: Array<string>, options: BackupExportOptions): Promise<void> {
        await this.backup.export(options.out)
    }
}

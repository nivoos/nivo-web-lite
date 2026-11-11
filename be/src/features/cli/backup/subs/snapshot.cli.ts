import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmImportService } from "@modules/domain/crm"

/** The options of `cli backup snapshot`. */
export interface BackupSnapshotOptions {
    /** The plaintext working copy of the data repository (`--out <dir>`). */
    readonly out: string
    /** The enterprise workspace exported (`--workspace <uuid>`). */
    readonly workspace: string
}

@SubCommand({
    name: "snapshot",
    description: "Write one workspace in the data repository's format nivo-web-lite-data@1 (the backup of record)",
})
/** `cli backup snapshot --out <dir> --workspace <uuid>`: delegates to the CRM import service, which logs counts only. */
export class BackupSnapshotCli extends CommandRunner {
    constructor(private readonly importer: CrmImportService) {
        super()
    }

    /** `--out <dir>`: the plaintext working copy of the data repository. */
    @Option({ flags: "--out <dir>", description: "The data repository's plaintext working copy", required: true })
    parseOut(value: string): string {
        return value
    }

    /** `--workspace <uuid>`: the workspace. */
    @Option({ flags: "--workspace <uuid>", description: "The enterprise workspace", required: true })
    parseWorkspace(value: string): string {
        return value
    }

    /** Exports through the import service. */
    async run(_passed: Array<string>, options: BackupSnapshotOptions): Promise<void> {
        await this.importer.exportSnapshot({ out: options.out, workspaceId: options.workspace })
    }
}

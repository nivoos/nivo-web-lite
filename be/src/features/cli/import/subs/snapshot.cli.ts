import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmImportService } from "@modules/domain/crm"

/** The options of `cli import snapshot`. */
export interface ImportSnapshotOptions {
    /** The plaintext snapshot directory of format @1 (`--from <dir>`). */
    readonly from: string
    /** The enterprise workspace the snapshot is bound to (`--workspace <uuid>`). */
    readonly workspace: string
    /** Write the rows (`--execute`); without it the snapshot is only checked and counted. */
    readonly execute?: boolean
}

@SubCommand({
    name: "snapshot",
    description: "Import a nivo-web-lite-data@1 snapshot into one workspace (dry unless --execute)",
})
/** `cli import snapshot --from <dir> --workspace <uuid> [--execute]`: delegates to the CRM import service, which logs counts only. */
export class ImportSnapshotCli extends CommandRunner {
    constructor(private readonly importer: CrmImportService) {
        super()
    }

    /** `--from <dir>`: the plaintext snapshot directory. */
    @Option({ flags: "--from <dir>", description: "The plaintext snapshot directory (format @1)", required: true })
    parseFrom(value: string): string {
        return value
    }

    /** `--workspace <uuid>`: the workspace. */
    @Option({ flags: "--workspace <uuid>", description: "The enterprise workspace", required: true })
    parseWorkspace(value: string): string {
        return value
    }

    /** `--execute`: write the rows. */
    @Option({ flags: "--execute", description: "Write the rows; without it nothing is written" })
    parseExecute(): boolean {
        return true
    }

    /** Imports (or checks) through the import service. */
    async run(_passed: Array<string>, options: ImportSnapshotOptions): Promise<void> {
        await this.importer.import({
            from: options.from,
            workspaceId: options.workspace,
            execute: options.execute,
        })
    }
}

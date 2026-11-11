import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmImportService } from "@modules/domain/crm"

/** The options of `cli documents upload`. */
export interface DocumentsUploadOptions {
    /** The folder of the originals (`--from <folder>`). */
    readonly from: string
    /** The enterprise workspace whose indexed documents are uploaded (`--workspace <uuid>`). */
    readonly workspace: string
    /** Upload (`--execute`); without it the originals are only verified and counted. */
    readonly execute?: boolean
}

@SubCommand({
    name: "upload",
    description:
        "Upload the originals of a workspace's indexed documents to the private storage (dry unless --execute)",
})
/** `cli documents upload --from <folder> --workspace <uuid> [--execute]`: delegates to the CRM import service; counts only. */
export class DocumentsUploadCli extends CommandRunner {
    constructor(private readonly importer: CrmImportService) {
        super()
    }

    /** `--from <folder>`: the folder of the originals. */
    @Option({ flags: "--from <folder>", description: "The folder of the originals", required: true })
    parseFrom(value: string): string {
        return value
    }

    /** `--workspace <uuid>`: the workspace. */
    @Option({ flags: "--workspace <uuid>", description: "The enterprise workspace", required: true })
    parseWorkspace(value: string): string {
        return value
    }

    /** `--execute`: upload. */
    @Option({ flags: "--execute", description: "Upload; without it nothing is uploaded" })
    parseExecute(): boolean {
        return true
    }

    /** Uploads (or verifies) through the import service. */
    async run(_passed: Array<string>, options: DocumentsUploadOptions): Promise<void> {
        await this.importer.uploadDocuments({
            from: options.from,
            workspaceId: options.workspace,
            execute: options.execute,
        })
    }
}

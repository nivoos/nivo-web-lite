import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmCredentialService } from "@modules/domain/crm"

/** The options of `cli credential issue`. */
export interface CredentialIssueOptions {
    /** The enterprise workspace the credential acts for (`--workspace <uuid>`). */
    readonly workspace: string
    /** What the credential is for (`--label <text>`). */
    readonly label: string
}

@SubCommand({
    name: "issue",
    description: "Issue a CRM service credential for one workspace; its bearer is shown once",
})
/** `cli credential issue --workspace <uuid> --label <text>`: delegates to the credentials service, which shows the bearer once. */
export class CredentialIssueCli extends CommandRunner {
    constructor(private readonly credentials: CrmCredentialService) {
        super()
    }

    /** `--workspace <uuid>`: the workspace. */
    @Option({ flags: "--workspace <uuid>", description: "The enterprise workspace", required: true })
    parseWorkspace(value: string): string {
        return value
    }

    /** `--label <text>`: what the credential is for. */
    @Option({ flags: "--label <text>", description: "What the credential is for", required: true })
    parseLabel(value: string): string {
        return value
    }

    /** Issues through the credentials service. */
    async run(_passed: Array<string>, options: CredentialIssueOptions): Promise<void> {
        await this.credentials.issue({ workspaceId: options.workspace, label: options.label })
    }
}

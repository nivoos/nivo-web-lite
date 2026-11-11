import { Command, CommandRunner } from "nest-commander"
import { CredentialIssueCli } from "./subs/issue.cli"
import { CredentialRevokeCli } from "./subs/revoke.cli"

@Command({
    name: "credential",
    description: "The CRM service credentials, one or more per workspace (issue, revoke)",
    subCommands: [CredentialIssueCli, CredentialRevokeCli],
})
/** `cli credential`: the credential group; its commands are the sub-commands (`cli credential issue`, `cli credential revoke`). */
export class CredentialCli extends CommandRunner {
    /** Without a sub-command the group shows its help. */
    run(): Promise<void> {
        return this.command.help()
    }
}

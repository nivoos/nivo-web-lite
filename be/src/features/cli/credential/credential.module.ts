import { Module } from "@nestjs/common"
import { CredentialCli } from "./credential.cli"
import { ConfigurableModuleClass } from "./credential.module-definition"
import { CredentialIssueCli } from "./subs/issue.cli"
import { CredentialRevokeCli } from "./subs/revoke.cli"

@Module({ providers: [CredentialCli, CredentialIssueCli, CredentialRevokeCli] })
/** The credential group: its command and its sub-commands; the work is the runner service the sub-command delegates to. */
export class CredentialModule extends ConfigurableModuleClass {}

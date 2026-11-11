import { CommandRunner, Option, SubCommand } from "nest-commander"
import { CrmCredentialService } from "@modules/domain/crm"

/** The options of `cli credential revoke`. */
export interface CredentialRevokeOptions {
    /** The credential id (`--id <uuid>`, the first part of its bearer). */
    readonly id: string
}

@SubCommand({ name: "revoke", description: "Revoke a CRM service credential; it is refused from then on" })
/** `cli credential revoke --id <uuid>`: delegates to the credentials service. */
export class CredentialRevokeCli extends CommandRunner {
    constructor(private readonly credentials: CrmCredentialService) {
        super()
    }

    /** `--id <uuid>`: the credential. */
    @Option({ flags: "--id <uuid>", description: "The credential id", required: true })
    parseId(value: string): string {
        return value
    }

    /** Revokes through the credentials service. */
    async run(_passed: Array<string>, options: CredentialRevokeOptions): Promise<void> {
        await this.credentials.revoke(options.id)
    }
}

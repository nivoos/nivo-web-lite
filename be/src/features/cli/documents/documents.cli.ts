import { Command, CommandRunner } from "nest-commander"
import { DocumentsUploadCli } from "./subs/upload.cli"

@Command({
    name: "documents",
    description: "The originals of the CRM documents in the private storage (upload)",
    subCommands: [DocumentsUploadCli],
})
/** `cli documents`: the documents group; its commands are the sub-commands (`cli documents upload`). */
export class DocumentsCli extends CommandRunner {
    /** Without a sub-command the group shows its help. */
    run(): Promise<void> {
        return this.command.help()
    }
}

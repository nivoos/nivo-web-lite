import { Command, CommandRunner } from "nest-commander"
import { ImportSnapshotCli } from "./subs/snapshot.cli"

@Command({
    name: "import",
    description: "The import of a nivo-web-lite-data@1 snapshot (snapshot)",
    subCommands: [ImportSnapshotCli],
})
/** `cli import`: the import group; its commands are the sub-commands (`cli import snapshot`). */
export class ImportCli extends CommandRunner {
    /** Without a sub-command the group shows its help. */
    run(): Promise<void> {
        return this.command.help()
    }
}

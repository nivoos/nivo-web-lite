import { CommandRunner, SubCommand } from "nest-commander"
import { MigrationRunnerService } from "@modules/platform/database"

@SubCommand({ name: "run", description: "Apply the pending db migrations" })
/** `cli migrate run`: delegates schema authority to the managed db:push script (starci app db migrate). */
export class RunCli extends CommandRunner {
    constructor(private readonly migrations: MigrationRunnerService) {
        super()
    }

    /** Runs the one managed migration wrapper and propagates its failure. */
    async run(): Promise<void> {
        await this.migrations.run()
    }
}

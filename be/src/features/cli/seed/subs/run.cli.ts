import { CommandRunner, Option, SubCommand } from "nest-commander"
import { DEFAULT_SEED_ENV, SeedRunnerService } from "@modules/platform/database"

/** The options of `cli seed run`. */
export interface SeedRunOptions {
    /** The stack environment whose `.starcistacks/<env>/seeds/sql` runs after `.starcistacks/seeds/sql`. */
    readonly env?: string
}

@SubCommand({ name: "run", description: "Run the tracked SQL seeds through the application role" })
/** `cli seed run [--env <name>]`: executes the shared SQL seeds, then the environment's, through the shared least-privilege EntityManager. */
export class RunSeedsCli extends CommandRunner {
    constructor(private readonly seeds: SeedRunnerService) {
        super()
    }

    /** `--env <name>`: the stack environment whose seed runs after the shared one. */
    @Option({
        flags: "--env <name>",
        description: "The stack environment whose seed runs",
        defaultValue: DEFAULT_SEED_ENV,
    })
    parseEnv(value: string): string {
        return value
    }

    /** Executes the shared seed and the environment's own. */
    async run(_passed: Array<string>, options?: SeedRunOptions): Promise<void> {
        await this.seeds.run(options?.env)
    }
}

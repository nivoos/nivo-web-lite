import { Module } from "@nestjs/common"
import { SeedCli } from "./seed.cli"
import { ConfigurableModuleClass } from "./seed.module-definition"
import { RunSeedsCli } from "./subs/run.cli"

@Module({ providers: [SeedCli, RunSeedsCli] })
/** The lite seed group: the command and its runner of the tracked SQL seeds. */
export class SeedModule extends ConfigurableModuleClass {}

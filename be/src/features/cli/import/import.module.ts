import { Module } from "@nestjs/common"
import { ImportCli } from "./import.cli"
import { ConfigurableModuleClass } from "./import.module-definition"
import { ImportSnapshotCli } from "./subs/snapshot.cli"

@Module({ providers: [ImportCli, ImportSnapshotCli] })
/** The import group: its command and its sub-commands; the work is the runner service the sub-command delegates to. */
export class ImportModule extends ConfigurableModuleClass {}

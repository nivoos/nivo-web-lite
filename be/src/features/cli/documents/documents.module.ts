import { Module } from "@nestjs/common"
import { DocumentsCli } from "./documents.cli"
import { ConfigurableModuleClass } from "./documents.module-definition"
import { DocumentsUploadCli } from "./subs/upload.cli"

@Module({ providers: [DocumentsCli, DocumentsUploadCli] })
/** The documents group: its command and its sub-commands; the work is the runner service the sub-command delegates to. */
export class DocumentsModule extends ConfigurableModuleClass {}

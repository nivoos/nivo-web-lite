import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./payable.module-definition"
import { ListPayablesHandler } from "./application/list-payables.handler"
import { RecordPayableNoteHandler } from "./application/record-payable-note.handler"

@Module({ providers: [ListPayablesHandler, RecordPayableNoteHandler] })
/** The payable feature: the handlers of its application. */
export class PayableApiModule extends ConfigurableModuleClass {}

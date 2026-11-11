/** Log events of the snapshot import; a line carries counts per entity only, never a name, a code or an amount. */
export enum CrmImportLogEvent {
    /** A snapshot was checked and counted without writing (`entities`). */
    Checked = "crm.import.checked",
    /** A snapshot was imported into a workspace (`entities`). */
    Imported = "crm.import.imported",
    /** Document originals were checked or uploaded (counts: `indexed`, `uploaded`, `alreadyStored`, `missing`, `mismatched`, `refused`, `unindexed`). */
    DocumentsUploaded = "crm.import.documents_uploaded",
}

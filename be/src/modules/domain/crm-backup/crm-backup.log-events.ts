/** Log events of the CRM backup; a line carries counts only, never a row. */
export enum CrmBackupLogEvent {
    /** A backup directory was written (`tables`, `rows`). */
    Exported = "crm_backup.exported",
    /** A backup directory was restored into an empty database (`tables`, `rows`). */
    Restored = "crm_backup.restored",
}

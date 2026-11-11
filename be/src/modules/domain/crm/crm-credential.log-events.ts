/** Log events of the CRM service credentials; a line names a credential by id and its workspace, never its secret. */
export enum CrmCredentialLogEvent {
    /** A credential was issued (`credentialId`, `workspaceId`). */
    Issued = "crm.credential.issued",
    /** A credential was revoked (`credentialId`). */
    Revoked = "crm.credential.revoked",
}

/** What issuing a service credential needs. */
export interface CredentialIssueInput {
    /** The enterprise workspace the credential acts for (a uuid). */
    readonly workspaceId: string
    /** What it is for (the NIVO connection it is handed to), 1 to 120 characters. */
    readonly label: string
}

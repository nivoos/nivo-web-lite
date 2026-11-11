import { posix } from "node:path"

/** How long a download link of a stored original works, in seconds: long enough to open it, too short to pass around. */
export const DOCUMENT_LINK_SECONDS = 120

/** A drive-letter path (`C:...`), which is never relative to the upload folder. */
const DRIVE = /^[A-Za-z]:/u

/** The object key of a document original: content-addressed inside its workspace's prefix, so a re-upload is the same object. */
export const documentKeyOf = (workspaceId: string, sha256: string): string => `${workspaceId}/documents/${sha256}`

/**
 * The index path normalised inside the upload folder with `/` separators (the documents index writes paths that way), or null when
 * it would leave the folder: absolute, on a drive, or climbing with `..`.
 */
export const insideFolderOf = (path: string): string | null => {
    const normalised = posix.normalize(path.replaceAll("\\", "/"))
    return posix.isAbsolute(normalised) || DRIVE.test(normalised) || normalised === ".." || normalised.startsWith("../")
        ? null
        : normalised
}

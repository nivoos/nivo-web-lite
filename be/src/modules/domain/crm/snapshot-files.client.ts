import { readFile, readdir } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { Injectable } from "@nestjs/common"
import { isRecord } from "@modules/platform/primitives"
import { CrmError, CrmErrorCode } from "./errors/crm.error"

@Injectable()
/** The local files the operator hands an import (`--from`): a plaintext snapshot directory of format @1, or the folder of document originals. */
export class SnapshotFilesClient {
    /** The text of `path` under `root`; a file that cannot be read is CRM_IMPORT_FILE_INVALID naming `entity`. */
    async read(root: string, path: string, entity: string): Promise<string> {
        try {
            return await readFile(join(root, path), "utf8")
        } catch (cause) {
            throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity }, cause })
        }
    }

    /** The bytes of `path` under `root`, or null when there is no such file. */
    async bytesOf(root: string, path: string): Promise<Uint8Array | null> {
        try {
            return new Uint8Array(await readFile(join(root, path)))
        } catch (error) {
            if (isRecord(error) && (error["code"] === "ENOENT" || error["code"] === "EISDIR")) return null
            throw error
        }
    }

    /** Every file under `root`, as paths relative to it with `/` separators. */
    async filesUnder(root: string): Promise<ReadonlyArray<string>> {
        const entries = await readdir(root, { recursive: true, withFileTypes: true })
        return entries
            .filter((entry) => entry.isFile())
            .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
    }
}

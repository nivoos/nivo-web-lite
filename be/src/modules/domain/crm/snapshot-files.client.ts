import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { Injectable } from "@nestjs/common"
import { CrmError, CrmErrorCode } from "./errors/crm.error"

@Injectable()
/** The files of a plaintext snapshot directory of format @1 on the local disk; the operator names the directory (`--from`). */
export class SnapshotFilesClient {
    /** The text of `path` under `root`; a file that cannot be read is CRM_IMPORT_FILE_INVALID naming `entity`. */
    async read(root: string, path: string, entity: string): Promise<string> {
        try {
            return await readFile(join(root, path), "utf8")
        } catch (cause) {
            throw new CrmError({ code: CrmErrorCode.ImportFileInvalid, params: { entity }, cause })
        }
    }
}

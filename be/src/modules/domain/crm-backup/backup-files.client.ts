import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { Injectable } from "@nestjs/common"
import { isRecord } from "@modules/platform/primitives"

@Injectable()
/** The files of a backup directory on the local disk; the operator names the directory (`--out`, `--from`). */
export class BackupFilesClient {
    /** The text of `path` under `root`, or null when the file does not exist. */
    async read(root: string, path: string): Promise<string | null> {
        try {
            return await readFile(join(root, path), "utf8")
        } catch (error) {
            if (isRecord(error) && error["code"] === "ENOENT") return null
            throw error
        }
    }

    /** Writes `text` to `path` under `root`, creating its folder. */
    async write(root: string, path: string, text: string): Promise<void> {
        await mkdir(dirname(join(root, path)), { recursive: true })
        await writeFile(join(root, path), text, "utf8")
    }
}

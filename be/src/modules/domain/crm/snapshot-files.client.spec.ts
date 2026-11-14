import { mkdir, rm, writeFile } from "node:fs/promises"
import { Test } from "@nestjs/testing"
import { CrmErrorCode } from "./errors/crm.error"
import { SnapshotFilesClient } from "./snapshot-files.client"

/** A scratch directory under the ignored jest cache. */
const ROOT = "node_modules/.cache/snapshot-files-spec"

beforeAll(async () => {
    await mkdir(`${ROOT}/a/b`, { recursive: true })
    await writeFile(`${ROOT}/manifest.json`, "{}\n", "utf8")
    await writeFile(`${ROOT}/a/b/doc.pdf`, "pdf", "utf8")
})

afterAll(async () => {
    await rm(ROOT, { recursive: true, force: true })
})

const build = async (): Promise<SnapshotFilesClient> => {
    const moduleRef = await Test.createTestingModule({ providers: [SnapshotFilesClient] }).compile()
    return moduleRef.get(SnapshotFilesClient)
}

describe("SnapshotFilesClient: snapshot text", () => {
    it("reads a snapshot file and refuses one that cannot be read, naming the entity", async () => {
        const files = await build()
        await expect(files.read(ROOT, "manifest.json", "manifest")).resolves.toBe("{}\n")
        await expect(files.read(ROOT, "data/customers.json", "customers")).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ImportFileInvalid, params: { entity: "customers" } }),
        )
    })
})

describe("SnapshotFilesClient: originals", () => {
    it("lists every file under the folder with / separators and reads one's bytes", async () => {
        const files = await build()
        const listed = await files.filesUnder(ROOT)
        expect([...listed].sort((a, b) => a.localeCompare(b))).toEqual(["a/b/doc.pdf", "manifest.json"])
        await expect(files.bytesOf(ROOT, "a/b/doc.pdf")).resolves.toEqual(new TextEncoder().encode("pdf"))
    })

    it("answers null for no file or a folder, and propagates any other failure", async () => {
        const files = await build()
        await expect(Promise.all([files.bytesOf(ROOT, "absent.pdf"), files.bytesOf(ROOT, "a")])).resolves.toEqual([
            null,
            null,
        ])
        await expect(files.bytesOf(ROOT, "bad\u0000name")).rejects.toEqual(
            expect.objectContaining({ code: "ERR_INVALID_ARG_VALUE" }),
        )
    })
})

describe("SnapshotFilesClient: writing", () => {
    it("writes text under the root, creating the missing folders", async () => {
        const files = await build()
        await files.write(ROOT, "out/nested/note.txt", "hello")
        await expect(files.read(ROOT, "out/nested/note.txt", "note")).resolves.toBe("hello")
    })
})

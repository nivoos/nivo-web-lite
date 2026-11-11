import { mkdir, rm, writeFile } from "node:fs/promises"
import { Test } from "@nestjs/testing"
import { CrmErrorCode } from "./errors/crm.error"
import { SnapshotFilesClient } from "./snapshot-files.client"

/** A scratch snapshot directory under the ignored jest cache. */
const ROOT = "node_modules/.cache/snapshot-files-spec"

beforeAll(async () => {
    await mkdir(ROOT, { recursive: true })
    await writeFile(`${ROOT}/manifest.json`, "{}\n", "utf8")
})

afterAll(async () => {
    await rm(ROOT, { recursive: true, force: true })
})

describe("SnapshotFilesClient", () => {
    it("reads a snapshot file and refuses one that cannot be read, naming the entity", async () => {
        const moduleRef = await Test.createTestingModule({ providers: [SnapshotFilesClient] }).compile()
        const files = moduleRef.get(SnapshotFilesClient)
        await expect(files.read(ROOT, "manifest.json", "manifest")).resolves.toBe("{}\n")
        await expect(files.read(ROOT, "data/customers.json", "customers")).rejects.toEqual(
            expect.objectContaining({ code: CrmErrorCode.ImportFileInvalid, params: { entity: "customers" } }),
        )
    })
})

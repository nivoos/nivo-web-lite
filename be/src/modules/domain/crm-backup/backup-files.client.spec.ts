import { rm } from "node:fs/promises"
import { Test } from "@nestjs/testing"
import { BackupFilesClient } from "./backup-files.client"

/** A scratch backup directory under the ignored jest cache. */
const ROOT = "node_modules/.cache/backup-files-spec"

afterAll(async () => {
    await rm(ROOT, { recursive: true, force: true })
})

const build = async (): Promise<BackupFilesClient> => {
    const moduleRef = await Test.createTestingModule({ providers: [BackupFilesClient] }).compile()
    return moduleRef.get(BackupFilesClient)
}

describe("BackupFilesClient", () => {
    it("writes a file in a new folder and reads it back", async () => {
        const files = await build()
        await files.write(ROOT, "tables/crm_tickets.json", "{}\n")
        await expect(files.read(ROOT, "tables/crm_tickets.json")).resolves.toBe("{}\n")
    })

    it("answers null for a file that does not exist and propagates any other failure", async () => {
        const files = await build()
        await expect(files.read(ROOT, "absent.json")).resolves.toBeNull()
        await expect(files.read(ROOT, "tables")).rejects.toEqual(expect.objectContaining({ code: "EISDIR" }))
    })
})

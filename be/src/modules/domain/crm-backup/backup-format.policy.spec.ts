import { Test } from "@nestjs/testing"
import { jsonOf, manifestOf, tableFileOf, tablePathOf } from "./backup-format.policy"
import { CrmBackupErrorCode } from "./errors/crm-backup.error"

const BACKUP_FORMAT_POLICY: unique symbol = Symbol("backup-format")

/** The policy under test, resolved through a testing module. */
interface BackupFormatPolicy {
    readonly jsonOf: typeof jsonOf
    readonly manifestOf: typeof manifestOf
    readonly tableFileOf: typeof tableFileOf
    readonly tablePathOf: typeof tablePathOf
}

const policy = async (): Promise<BackupFormatPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: BACKUP_FORMAT_POLICY,
                useFactory: (): BackupFormatPolicy => ({ jsonOf, manifestOf, tableFileOf, tablePathOf }),
            },
        ],
    }).compile()
    return moduleRef.get<BackupFormatPolicy>(BACKUP_FORMAT_POLICY)
}

const FILE = {
    schema: "nivo-web-lite-data/table@2",
    exportedAt: "2026-11-12T03:00:00.000Z",
    source: "nivo-web-crm",
    table: "crm_tickets",
    items: [{ id: "t-1" }],
}

describe("backup format policy: files", () => {
    it("names the file of a table and parses JSON or refuses with the code it is given", async () => {
        const subject = await policy()
        expect([
            subject.tablePathOf("crm_tickets"),
            subject.jsonOf("[1]", CrmBackupErrorCode.DigestMismatch, "t"),
        ]).toEqual(["tables/crm_tickets.json", [1]])
        await expect(
            Promise.resolve().then(() => subject.jsonOf("{", CrmBackupErrorCode.DigestMismatch, "crm_tickets")),
        ).rejects.toEqual(
            expect.objectContaining({ code: CrmBackupErrorCode.DigestMismatch, params: { table: "crm_tickets" } }),
        )
    })

    it("reads a table file of its own table only, with object rows only", async () => {
        const subject = await policy()
        expect(subject.tableFileOf(FILE, "crm_tickets")).toEqual(FILE)
        expect([
            subject.tableFileOf(FILE, "crm_customers"),
            subject.tableFileOf({ ...FILE, items: [1] }, "crm_tickets"),
            subject.tableFileOf({ ...FILE, schema: "other" }, "crm_tickets"),
            subject.tableFileOf(null, "crm_tickets"),
        ]).toEqual([null, null, null, null])
    })
})

describe("backup format policy: manifest", () => {
    it("reads a manifest of format @2 and refuses any other shape", async () => {
        const subject = await policy()
        const manifest = {
            format: "nivo-web-lite-data@2",
            snapshotAt: "2026-11-12T03:00:00.000Z",
            source: "nivo-web-crm",
            files: [{ path: "tables/crm_tickets.json", table: "crm_tickets", items: 1, sha256: "ab" }],
        }
        expect(subject.manifestOf(manifest)).toEqual(manifest)
        await expect(
            Promise.all([Promise.resolve().then(() => subject.manifestOf({ ...manifest, files: [{ path: "x" }] }))]),
        ).rejects.toEqual(expect.objectContaining({ code: CrmBackupErrorCode.ManifestInvalid }))
        await expect(
            Promise.resolve().then(() => subject.manifestOf({ ...manifest, format: "nivo-web-lite-data@1" })),
        ).rejects.toEqual(expect.objectContaining({ code: CrmBackupErrorCode.ManifestInvalid }))
    })
})

import { Test } from "@nestjs/testing"
import { CrmErrorCode } from "./errors/crm.error"
import {
    contactRowOf,
    contractRowOf,
    documentRowOf,
    issueRowOf,
    receivableRowOf,
    serviceRowOf,
} from "./snapshot-rows.mapper"

const SNAPSHOT_ROWS_MAPPER: unique symbol = Symbol("snapshot-rows")

/** The mapper under test, resolved through a testing module. */
interface SnapshotRowsMapper {
    readonly contactRowOf: typeof contactRowOf
    readonly contractRowOf: typeof contractRowOf
    readonly documentRowOf: typeof documentRowOf
    readonly issueRowOf: typeof issueRowOf
    readonly receivableRowOf: typeof receivableRowOf
    readonly serviceRowOf: typeof serviceRowOf
}

const mapper = async (): Promise<SnapshotRowsMapper> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: SNAPSHOT_ROWS_MAPPER,
                useFactory: (): SnapshotRowsMapper => ({
                    contactRowOf,
                    contractRowOf,
                    documentRowOf,
                    issueRowOf,
                    receivableRowOf,
                    serviceRowOf,
                }),
            },
        ],
    }).compile()
    return moduleRef.get<SnapshotRowsMapper>(SNAPSHOT_ROWS_MAPPER)
}

const WS = "6f1c2a9e-0000-4000-8000-00000000a001"
const STAMP = { workspaceId: WS, runId: "run-1", hash: "h" }
const REFS = { customers: new Map([["SYN-001", "c-1"]]), websites: new Map<string, string>(), projects: new Map() }
const ORIGIN = { file: "f", sheet: "S", row: 3 }
const SERVICE = {
    code: "S",
    customerCode: "SYN-001",
    domain: "x.example",
    class: "ssl",
    provider: "",
    status: "active",
    statusText: null,
    startsOn: null,
    expiresOn: null,
    expiryBasis: null,
    expirySource: "none",
    note: null,
    origin: ORIGIN,
}
const ISSUE = {
    entity: "invoices",
    field: "",
    reason: "total_row",
    severity: "rejected",
    raw: { A: "x" },
    origin: ORIGIN,
}

describe("snapshot rows mapper: references", () => {
    it("keeps a soft reference null when unknown and reads an empty provider as none", async () => {
        const subject = await mapper()
        const contract = { contractNo: "HD", kind: "nda", customerCode: "NOT-THERE", autoRenew: false, origin: ORIGIN }
        expect([
            subject.serviceRowOf(SERVICE, STAMP, REFS),
            subject.contractRowOf(contract, STAMP, REFS),
            subject.receivableRowOf({ projectCode: "P-9", total: null, origin: ORIGIN }, STAMP, REFS),
        ]).toEqual([
            expect.objectContaining({ customerId: "c-1", websiteId: null, provider: null, sourceRow: 3 }),
            expect.objectContaining({ customerId: null, autoRenew: false }),
            expect.objectContaining({ projectId: null, customerId: null, totalVnd: null }),
        ])
    })

    it("refuses an unknown required customer and a value outside its closed set", async () => {
        const subject = await mapper()
        await expect(
            Promise.resolve().then(() => subject.contactRowOf({ customerCode: "NOT-THERE", name: "n" }, WS, REFS)),
        ).rejects.toEqual(
            expect.objectContaining({
                code: CrmErrorCode.ImportReferenceUnknown,
                params: { entity: "contacts", field: "customerCode" },
            }),
        )
        await expect(
            Promise.resolve().then(() => subject.serviceRowOf({ ...SERVICE, class: "mailbox" }, STAMP, REFS)),
        ).rejects.toEqual(expect.objectContaining({ code: CrmErrorCode.ImportItemInvalid }))
    })
})

describe("snapshot rows mapper: provenance", () => {
    it("gives a document its own path as provenance and an issue its raw cells", async () => {
        const subject = await mapper()
        const document = {
            path: "a/b.pdf",
            customerCode: null,
            kind: "invoice",
            invoiceNo: null,
            contractNo: null,
            fileName: "b.pdf",
            sizeBytes: 3,
        }
        expect([
            subject.documentRowOf(document, STAMP, REFS),
            subject.issueRowOf(ISSUE, STAMP),
            subject.issueRowOf({ ...ISSUE, raw: "x", origin: null }, STAMP),
        ]).toEqual([
            expect.objectContaining({ sourceFile: "a/b.pdf", sourceSheet: "", sourceRow: 0, lastImportRunId: "run-1" }),
            expect.objectContaining({ sourceFile: "f", raw: { A: "x" } }),
            expect.objectContaining({ sourceFile: "", sourceRow: 0, raw: {} }),
        ])
    })
})

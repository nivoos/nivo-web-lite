import { Test } from "@nestjs/testing"
import { isRecord } from "@modules/platform/primitives"
import { CrmErrorCode } from "./errors/crm.error"
import { snapshotEntriesOf, snapshotItemsOf, snapshotJsonOf } from "./snapshot-format.policy"

const SNAPSHOT_FORMAT_POLICY: unique symbol = Symbol("snapshot-format")

/** The policy under test, resolved through a testing module. */
interface SnapshotFormatPolicy {
    readonly snapshotEntriesOf: typeof snapshotEntriesOf
    readonly snapshotItemsOf: typeof snapshotItemsOf
    readonly snapshotJsonOf: typeof snapshotJsonOf
}

const policy = async (): Promise<SnapshotFormatPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: SNAPSHOT_FORMAT_POLICY,
                useFactory: (): SnapshotFormatPolicy => ({ snapshotEntriesOf, snapshotItemsOf, snapshotJsonOf }),
            },
        ],
    }).compile()
    return moduleRef.get<SnapshotFormatPolicy>(SNAPSHOT_FORMAT_POLICY)
}

const ORIGIN = { file: "f", sheet: "", row: 0 }
const ENTRY = {
    path: "data/documents.json",
    entity: "documents",
    schema: "nivo-web-lite-data/documents@1",
    items: 1,
    sha256: "x",
}
const DOCUMENT = {
    path: "p",
    customerCode: null,
    kind: "contract",
    invoiceNo: null,
    contractNo: null,
    fileName: "f",
    sizeBytes: 3,
    sha256: "a",
}
const ISSUE = { entity: "invoices", field: "", reason: "r", severity: "warning", raw: {}, origin: ORIGIN }
const ISSUE_ENTRY = { ...ENTRY, path: "data/issues.json", entity: "issues", schema: "nivo-web-lite-data/issues@1" }

/** The code a call refused with, or null when it answered. */
const refusalOf = (call: () => unknown): Promise<unknown> =>
    Promise.resolve()
        .then(call)
        .then(
            () => null,
            (error: unknown) => (isRecord(error) ? error["code"] : "uncoded"),
        )

/** A documents file of `items`. */
const documents = (items: ReadonlyArray<unknown>): object => ({ schema: ENTRY.schema, items })

/** An issues file of one issue changed by `change`. */
const issues = (change: object): object => ({ schema: ISSUE_ENTRY.schema, items: [{ ...ISSUE, ...change }] })

describe("snapshot format policy: items", () => {
    it("accepts items whose every field has its kind", async () => {
        const subject = await policy()
        expect([
            subject.snapshotItemsOf("documents", documents([DOCUMENT]), ENTRY),
            subject.snapshotItemsOf("issues", issues({}), ISSUE_ENTRY),
        ]).toEqual([[DOCUMENT], [ISSUE]])
    })

    it("refuses a missing, mistyped or empty-string field, a non-object item, a bad origin and a raw that is no object", async () => {
        const subject = await policy()
        const refusals = await Promise.all([
            refusalOf(() => subject.snapshotItemsOf("documents", documents([{ ...DOCUMENT, sizeBytes: 1.5 }]), ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("documents", documents([{ ...DOCUMENT, invoiceNo: "" }]), ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("documents", documents(["x"]), ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("issues", issues({ origin: {} }), ISSUE_ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("issues", issues({ raw: "x" }), ISSUE_ENTRY)),
        ])
        expect(refusals).toEqual(Array.from({ length: 5 }, () => CrmErrorCode.ImportItemInvalid))
    })

    it("refuses a file of another schema, another count, no item list or an unknown entity", async () => {
        const subject = await policy()
        const refusals = await Promise.all([
            refusalOf(() => subject.snapshotItemsOf("documents", { schema: "other@1", items: [DOCUMENT] }, ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("documents", documents([]), ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("documents", { schema: ENTRY.schema }, ENTRY)),
            refusalOf(() => subject.snapshotItemsOf("mailboxes", {}, ENTRY)),
        ])
        expect(refusals).toEqual(Array.from({ length: 4 }, () => CrmErrorCode.ImportFileInvalid))
    })
})

describe("snapshot format policy: manifest and JSON", () => {
    it("reads the entries of a manifest @1 and refuses another format, a malformed entry or an unknown entity", async () => {
        const subject = await policy()
        const manifest = (files: ReadonlyArray<unknown>, format = "nivo-web-lite-data@1"): object => ({ format, files })
        expect(subject.snapshotEntriesOf(manifest([ENTRY]))).toEqual([ENTRY])
        const refusals = await Promise.all([
            refusalOf(() => subject.snapshotEntriesOf(manifest([ENTRY], "nivo-web-lite-data@2"))),
            refusalOf(() => subject.snapshotEntriesOf(manifest([{ path: 1 }]))),
            refusalOf(() => subject.snapshotEntriesOf(manifest([{ ...ENTRY, entity: "x" }]))),
        ])
        expect(refusals).toEqual(Array.from({ length: 3 }, () => CrmErrorCode.ImportManifestInvalid))
    })

    it("parses JSON or refuses with the code it is given", async () => {
        const subject = await policy()
        expect(subject.snapshotJsonOf("[1]", CrmErrorCode.ImportFileInvalid, "x")).toEqual([1])
        await expect(refusalOf(() => subject.snapshotJsonOf("{", CrmErrorCode.ImportFileInvalid, "x"))).resolves.toBe(
            CrmErrorCode.ImportFileInvalid,
        )
    })
})

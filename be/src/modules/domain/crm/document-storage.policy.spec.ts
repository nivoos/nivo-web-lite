import { Test } from "@nestjs/testing"
import { documentKeyOf, insideFolderOf } from "./document-storage.policy"

const DOCUMENT_STORAGE_POLICY: unique symbol = Symbol("document-storage")

/** The policy under test, resolved through a testing module. */
interface DocumentStoragePolicy {
    readonly documentKeyOf: typeof documentKeyOf
    readonly insideFolderOf: typeof insideFolderOf
}

const policy = async (): Promise<DocumentStoragePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: DOCUMENT_STORAGE_POLICY,
                useFactory: (): DocumentStoragePolicy => ({ documentKeyOf, insideFolderOf }),
            },
        ],
    }).compile()
    return moduleRef.get<DocumentStoragePolicy>(DOCUMENT_STORAGE_POLICY)
}

describe("document storage policy", () => {
    it("keys an original by its sha256 inside its workspace's prefix", async () => {
        expect((await policy()).documentKeyOf("ws-1", "ab")).toBe("ws-1/documents/ab")
    })

    it("keeps an index path inside the folder with / separators, and refuses one that leaves it", async () => {
        const subject = await policy()
        expect([
            subject.insideFolderOf("a/./b.pdf"),
            subject.insideFolderOf("a\\b.pdf"),
            subject.insideFolderOf("a/../b.pdf"),
        ]).toEqual(["a/b.pdf", "a/b.pdf", "b.pdf"])
        expect([
            subject.insideFolderOf("../x.pdf"),
            subject.insideFolderOf(".."),
            subject.insideFolderOf("/etc/x"),
            subject.insideFolderOf("C:\\x.pdf"),
        ]).toEqual([null, null, null, null])
    })
})

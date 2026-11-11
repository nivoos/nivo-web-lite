import { Test } from "@nestjs/testing"
import { quotedPurchaseRow } from "@tests/fixtures/builders/purchase.builder"
import { contractRowOf, crmProvenance, projectRowOf, receivableRowOf, serviceRowOf } from "./purchase-records.mapper"

const PURCHASE_RECORDS_MAPPER: unique symbol = Symbol("purchase-records")

/** The mapper under test, resolved through a testing module. */
interface PurchaseRecordsMapper {
    readonly contractRowOf: typeof contractRowOf
    readonly crmProvenance: typeof crmProvenance
    readonly projectRowOf: typeof projectRowOf
    readonly receivableRowOf: typeof receivableRowOf
    readonly serviceRowOf: typeof serviceRowOf
}

const mapper = async (): Promise<PurchaseRecordsMapper> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: PURCHASE_RECORDS_MAPPER,
                useFactory: (): PurchaseRecordsMapper => ({
                    contractRowOf,
                    crmProvenance,
                    projectRowOf,
                    receivableRowOf,
                    serviceRowOf,
                }),
            },
        ],
    }).compile()
    return moduleRef.get<PurchaseRecordsMapper>(PURCHASE_RECORDS_MAPPER)
}

describe("purchase records mapper", () => {
    it("opens the records of an accepted quote under the CRM's own provenance, keyed by their codes", async () => {
        const subject = await mapper()
        const purchase = quotedPurchaseRow()
        const provenance = subject.crmProvenance("HD-1")
        expect([
            provenance.sourceFile,
            provenance.sourceSheet,
            provenance.sourceRow,
            provenance.lastImportRunId,
        ]).toEqual(["crm", "purchase", 0, null])
        expect(provenance.sourceHash).toMatch(/^[0-9a-f]{64}$/u)
        expect([
            subject.projectRowOf(purchase, "c-1", "P-1"),
            subject.serviceRowOf("ws", "c-1", "S-1", "ssl"),
            subject.contractRowOf(purchase, "c-1", "HD-1"),
            subject.receivableRowOf(purchase, "c-1", "P-1", "HD-1"),
        ]).toEqual([
            expect.objectContaining({ code: "P-1", customerId: "c-1", valueVnd: 10_000_000, remainingVnd: 11_000_000 }),
            expect.objectContaining({ code: "S-1", serviceClass: "ssl", status: "pending", provider: null }),
            expect.objectContaining({ contractNo: "HD-1", kind: "sale", valueVnd: 10_000_000 }),
            expect.objectContaining({ projectCode: "P-1", contractRef: "HD-1", totalVnd: 11_000_000, collectedVnd: 0 }),
        ])
    })
})

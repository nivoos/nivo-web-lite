import { Test } from "@nestjs/testing"
import { documentRow, serviceRow } from "@tests/fixtures/builders/crm.builder"
import { ContactEntity, ProviderAccountEntity } from "./persistence/entities"
import { contactItemOf, documentItemOf, providerItemOf, serviceItemOf } from "./snapshot-items.mapper"

const SNAPSHOT_ITEMS_MAPPER: unique symbol = Symbol("snapshot-items")

/** The mapper under test, resolved through a testing module. */
interface SnapshotItemsMapper {
    readonly contactItemOf: typeof contactItemOf
    readonly documentItemOf: typeof documentItemOf
    readonly providerItemOf: typeof providerItemOf
    readonly serviceItemOf: typeof serviceItemOf
}

const mapper = async (): Promise<SnapshotItemsMapper> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: SNAPSHOT_ITEMS_MAPPER,
                useFactory: (): SnapshotItemsMapper => ({
                    contactItemOf,
                    documentItemOf,
                    providerItemOf,
                    serviceItemOf,
                }),
            },
        ],
    }).compile()
    return moduleRef.get<SnapshotItemsMapper>(SNAPSHOT_ITEMS_MAPPER)
}

/** The natural keys of the synthetic ids: customer uuid(1) is SYN-001; no website is known. */
const NAMES = {
    customers: new Map([["00000000-0000-4000-8000-000000000001", "SYN-001"]]),
    websites: new Map<string, string>(),
}

describe("snapshot items mapper: what the CRM made itself", () => {
    it("names a CRM-made provider account its own plugin and a CRM-added contact an empty source place", async () => {
        const subject = await mapper()
        const account = Object.assign(new ProviderAccountEntity(), { provider: "tino", mode: "dry_run", plugin: null })
        const contact = Object.assign(new ContactEntity(), {
            customerId: "00000000-0000-4000-8000-000000000001",
            name: "n",
            phone: null,
            email: null,
            role: null,
            sourceFile: null,
            sourceSheet: null,
            sourceRow: null,
        })
        expect([subject.providerItemOf(account), subject.contactItemOf(contact, NAMES)]).toEqual([
            { key: "tino", mode: "dry_run", plugin: "tino" },
            {
                customerCode: "SYN-001",
                name: "n",
                phone: null,
                email: null,
                role: null,
                origin: { file: "", sheet: "", row: 0 },
            },
        ])
    })
})

describe("snapshot items mapper: references written back", () => {
    it("writes no provider as the format's empty provider and an unknown or absent reference as null", async () => {
        const subject = await mapper()
        const service = subject.serviceItemOf(
            serviceRow({ provider: null, websiteId: "00000000-0000-4000-8000-000000000099" }),
            NAMES,
        )
        const document = subject.documentItemOf(documentRow({ customerId: null, sha256: null }), NAMES)
        expect([service["provider"], service["customerCode"], service["domain"]]).toEqual(["", "SYN-001", null])
        expect([document["customerCode"], document["sha256"]]).toEqual([null, ""])
    })
})

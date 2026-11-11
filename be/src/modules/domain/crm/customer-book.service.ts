import { Injectable } from "@nestjs/common"
import { And, type EntityManager, type FindOptionsWhere, ILike, In, MoreThan } from "typeorm"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { CollectionsService } from "./collections.service"
import {
    likeOf,
    toContactView,
    toContractView,
    toCustomerSummary,
    toDocumentView,
    toInvoiceView,
    toLedgerView,
    toServiceView,
} from "./crm.mapper"
import { DOCUMENT_LINK_SECONDS } from "./document-storage.policy"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import {
    ContactEntity,
    ContractEntity,
    CustomerEntity,
    DocumentEntity,
    InvoiceEntity,
    LedgerBalanceEntity,
    ReceivableEntity,
    ServiceEntity,
    WebsiteEntity,
} from "./persistence/entities"
import type {
    BalanceView,
    ContactLinkInput,
    ContactLinkResult,
    ContractView,
    CustomerFindInput,
    CustomerKey,
    CustomerListInput,
    CustomerSummaryView,
    CustomerView,
    DocumentLinkInput,
    DocumentLinkView,
    DocumentView,
    InvoiceView,
} from "./customer.contracts"
import type { ServiceView } from "./service.contracts"
import {
    InjectObjectStorage,
    InjectObjectStorageBucket,
    type ObjectStorage,
} from "@modules/integrations/object-storage"

/** The head of a list of what belongs to one customer. */
interface CustomerListHead {
    /** The customer. */
    readonly customer: CustomerEntity
    /** The page size. */
    readonly limit: number
    /** The last key of the previous page, if any. */
    readonly after: string | undefined
}

/** The rows of one customer in one workspace. */
interface OwnerScope {
    /** The workspace. */
    readonly workspaceId: string
    /** The customer. */
    readonly customerId: string
}

/** Reads up to `take` rows of one customer after a key. */
type OwnedFind<Row> = (scope: OwnerScope, after: string | undefined, take: number) => Promise<Array<Row>>

/** The scope of what belongs to one customer. */
const ownedBy = (workspaceId: string, customerId: string): OwnerScope => ({ workspaceId, customerId })

/** A customer's contracts after a contract number. */
const contractsOf =
    (manager: EntityManager): OwnedFind<ContractEntity> =>
    (scope, after, take) =>
        manager.find(ContractEntity, {
            where: { ...scope, ...(after === undefined ? {} : { contractNo: MoreThan(after) }) },
            order: { contractNo: "ASC" },
            take,
        })

/** A customer's invoices after an invoice number. */
const invoicesOf =
    (manager: EntityManager): OwnedFind<InvoiceEntity> =>
    (scope, after, take) =>
        manager.find(InvoiceEntity, {
            where: { ...scope, ...(after === undefined ? {} : { invoiceNo: MoreThan(after) }) },
            order: { invoiceNo: "ASC" },
            take,
        })

/** A customer's documents after a path. */
const documentsOf =
    (manager: EntityManager): OwnedFind<DocumentEntity> =>
    (scope, after, take) =>
        manager.find(DocumentEntity, {
            where: { ...scope, ...(after === undefined ? {} : { path: MoreThan(after) }) },
            order: { path: "ASC" },
            take,
        })

/** The keyset names of the customer lists. */
const LISTS = {
    find: "customer.find",
    services: "customer.service.list",
    contracts: "customer.contract.list",
    invoices: "customer.invoice.list",
    documents: "customer.document.list",
} as const

/** The most domains a search matches by domain before it narrows to customers. */
const DOMAIN_MATCHES = 50

/** Which contact column holds each channel's address. */
const CONTACT_COLUMN = { zalo: "zaloId", email: "email", phone: "phone" } as const

@Injectable()
/** The customer book: one customer, the search, what belongs to a customer (services, contracts, invoices, documents, balance), contact links. */
export class CustomerBookService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectIds() private readonly ids: Ids,
        private readonly collections: CollectionsService,
        @InjectObjectStorage() private readonly storage: ObjectStorage,
        @InjectObjectStorageBucket() private readonly bucket: string,
    ) {}

    /** One customer with its domains and contacts. */
    async get(key: CustomerKey): Promise<CustomerView> {
        const customer = await this.customerOf(key)
        const websites = await this.entityManager.find(WebsiteEntity, {
            where: { workspaceId: key.workspaceId, customerId: customer.id },
            order: { domain: "ASC" },
            take: 50,
        })
        const contacts = await this.entityManager.find(ContactEntity, {
            where: { workspaceId: key.workspaceId, customerId: customer.id },
            order: { createdAt: "ASC" },
            take: 20,
        })
        return {
            ...toCustomerSummary(customer, contacts.length > 0),
            address: customer.address,
            folderPath: customer.folderPath,
            domains: websites.map((website) => website.domain),
            contacts: contacts.map((contact) => toContactView(contact)),
        }
    }

    /** Customers whose code, name, tax id, phone, e-mail or a website domain contains `q`, by code. */
    async search(input: CustomerFindInput): Promise<Page<CustomerSummaryView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(LISTS.find, input.page.cursor, 1)?.[0]
        const pattern = likeOf(input.q.trim())
        const sites = await this.entityManager.find(WebsiteEntity, {
            where: { workspaceId: input.workspaceId, domain: ILike(pattern) },
            take: DOMAIN_MATCHES,
        })
        const code = after === undefined ? ILike(pattern) : And(ILike(pattern), MoreThan(after))
        const tail: FindOptionsWhere<CustomerEntity> = {
            workspaceId: input.workspaceId,
            ...(after === undefined ? {} : { code: MoreThan(after) }),
        }
        const where: Array<FindOptionsWhere<CustomerEntity>> = [
            { workspaceId: input.workspaceId, code },
            { ...tail, name: ILike(pattern) },
            { ...tail, taxId: ILike(pattern) },
            { ...tail, phone: ILike(pattern) },
            { ...tail, email: ILike(pattern) },
            ...(sites.length === 0 ? [] : [{ ...tail, id: In(sites.map((site) => site.customerId)) }]),
        ]
        const rows = await this.entityManager.find(CustomerEntity, { where, order: { code: "ASC" }, take: limit + 1 })
        const linked = await this.customersWithContacts(
            input.workspaceId,
            rows.slice(0, limit).map((row) => row.id),
        )
        return pageOf(
            LISTS.find,
            rows,
            limit,
            (row) => [row.code],
            rows.slice(0, limit).map((row) => toCustomerSummary(row, linked.has(row.id))),
        )
    }

    /** A customer's services, by code. */
    async listServices(input: CustomerListInput): Promise<Page<ServiceView>> {
        const { customer, limit, after } = await this.listHead(input, LISTS.services)
        const rows = await this.entityManager.find(ServiceEntity, {
            where: {
                ...ownedBy(input.workspaceId, customer.id),
                ...(after === undefined ? {} : { code: MoreThan(after) }),
            },
            order: { code: "ASC" },
            take: limit + 1,
        })
        const websiteIds = [...new Set(rows.flatMap((row) => (row.websiteId === null ? [] : [row.websiteId])))]
        const sites =
            websiteIds.length === 0
                ? []
                : await this.entityManager.find(WebsiteEntity, {
                      where: { workspaceId: input.workspaceId, id: In(websiteIds) },
                      take: websiteIds.length,
                  })
        const domains = new Map(sites.map((site) => [site.id, site.domain]))
        return pageOf(
            LISTS.services,
            rows,
            limit,
            (row) => [row.code],
            rows
                .slice(0, limit)
                .map((row) =>
                    toServiceView(
                        row,
                        customer.code,
                        row.websiteId === null ? null : (domains.get(row.websiteId) ?? null),
                    ),
                ),
        )
    }

    /** A customer's contracts, by contract number. */
    listContracts(input: CustomerListInput): Promise<Page<ContractView>> {
        return this.ownedList(
            input,
            LISTS.contracts,
            (row: ContractEntity) => row.contractNo,
            toContractView,
            contractsOf(this.entityManager),
        )
    }

    /** A customer's VAT invoices, by invoice number. */
    listInvoices(input: CustomerListInput): Promise<Page<InvoiceView>> {
        return this.ownedList(
            input,
            LISTS.invoices,
            (row: InvoiceEntity) => row.invoiceNo,
            toInvoiceView,
            invoicesOf(this.entityManager),
        )
    }

    /** A customer's document references, by path. */
    listDocuments(input: CustomerListInput): Promise<Page<DocumentView>> {
        return this.ownedList(
            input,
            LISTS.documents,
            (row: DocumentEntity) => row.path,
            toDocumentView,
            documentsOf(this.entityManager),
        )
    }

    /**
     * A short-lived download link of the stored original of one of the customer's documents: the document must belong to that
     * customer (in the calling workspace) and be uploaded; the link names the file and works for DOCUMENT_LINK_SECONDS.
     */
    async documentLink(input: DocumentLinkInput): Promise<DocumentLinkView> {
        const customer = await this.customerOf(input)
        const document = await this.entityManager.findOne(DocumentEntity, {
            where: { workspaceId: input.workspaceId, customerId: customer.id, path: input.path },
        })
        if (document === null) throw new CrmError({ code: CrmErrorCode.DocumentNotFound })
        if (document.storageKey === null) throw new CrmError({ code: CrmErrorCode.DocumentNotStored })
        const link = await this.storage.presignGet(this.bucket, document.storageKey, {
            expiresIn: DOCUMENT_LINK_SECONDS,
            downloadName: document.fileName,
        })
        return { url: link.url, expiresAt: link.expiresAt }
    }

    /** The TK131 balance and the open receivables of a customer, side by side (facts only, never summed together). */
    async balance(key: CustomerKey): Promise<BalanceView> {
        const customer = await this.customerOf(key)
        const ledger = await this.entityManager.findOne(LedgerBalanceEntity, {
            where: { workspaceId: key.workspaceId, account: "131", customerId: customer.id },
        })
        const open = await this.entityManager.find(ReceivableEntity, {
            where: { workspaceId: key.workspaceId, customerId: customer.id, remainingVnd: MoreThan(0) },
            order: { projectCode: "ASC" },
            take: 50,
        })
        const views = await this.collections.receivableViews(key.workspaceId, open)
        const openReceivables = open.flatMap((row) => views.get(row.id) ?? [])
        return {
            customerCode: customer.code,
            ledger131: ledger === null ? null : toLedgerView(ledger),
            openReceivables,
            openRemainingVnd: openReceivables.reduce((sum, row) => sum + row.remainingVnd, 0),
        }
    }

    /** Links a Zalo id, e-mail or phone to a customer; linking the same address again changes nothing but the name. */
    linkContact(input: ContactLinkInput): Promise<ContactLinkResult> {
        return this.entityManager.transaction(async (manager) => {
            const customer = await this.customerOf(input, manager)
            const column = CONTACT_COLUMN[input.channel]
            const stored = await manager.findOne(ContactEntity, {
                where: { workspaceId: input.workspaceId, customerId: customer.id, [column]: input.address },
            })
            if (stored !== null) {
                if (input.name !== null && input.name !== stored.name) {
                    await manager.update(
                        ContactEntity,
                        { id: stored.id, workspaceId: input.workspaceId },
                        { name: input.name },
                    )
                }
                return {
                    customerCode: customer.code,
                    created: false,
                    contact: toContactView({ ...stored, name: input.name ?? stored.name }),
                }
            }
            const row = manager.create(ContactEntity, {
                id: this.ids.next(),
                workspaceId: input.workspaceId,
                customerId: customer.id,
                name: (input.name ?? customer.name).slice(0, 200),
                phone: null,
                email: null,
                zaloId: null,
                preferredChannel: input.channel,
                [column]: input.address,
            })
            await manager.insert(ContactEntity, row)
            return { customerCode: customer.code, created: true, contact: toContactView(row) }
        })
    }

    /** One page of what belongs to one customer: the head, the rows read by `find`, the page in key order. */
    private async ownedList<Row, View>(
        input: CustomerListInput,
        list: string,
        keyOf: (row: Row) => string,
        viewOf: (row: Row) => View,
        find: OwnedFind<Row>,
    ): Promise<Page<View>> {
        const { customer, limit, after } = await this.listHead(input, list)
        const rows = await find(ownedBy(input.workspaceId, customer.id), after, limit + 1)
        return pageOf(
            list,
            rows,
            limit,
            (row) => [keyOf(row)],
            rows.slice(0, limit).map((row) => viewOf(row)),
        )
    }

    /** The customer, the page size and the keyset position of a list of what belongs to one customer. */
    private async listHead(input: CustomerListInput, list: string): Promise<CustomerListHead> {
        const customer = await this.customerOf(input)
        return { customer, limit: pageSizeOf(input.page.limit), after: decodeCursor(list, input.page.cursor, 1)?.[0] }
    }

    private async customerOf(key: CustomerKey, manager: EntityManager = this.entityManager): Promise<CustomerEntity> {
        const customer = await manager.findOne(CustomerEntity, {
            where: { workspaceId: key.workspaceId, code: key.code },
        })
        if (customer === null) throw new CrmError({ code: CrmErrorCode.CustomerNotFound })
        return customer
    }

    private async customersWithContacts(
        workspaceId: string,
        customerIds: ReadonlyArray<string>,
    ): Promise<ReadonlySet<string>> {
        if (customerIds.length === 0) return new Set()
        const contacts = await this.entityManager.find(ContactEntity, {
            where: { workspaceId, customerId: In([...customerIds]) },
            take: 1000,
        })
        return new Set(contacts.map((contact) => contact.customerId))
    }
}

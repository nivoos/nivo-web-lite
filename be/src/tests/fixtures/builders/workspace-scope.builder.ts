import { type MockEntityManager, mockEntityManager, queueQueryBuilders } from "@starci/jest-preset"
import type {
    CollectionsService,
    CustomerBookService,
    InvoiceDraftsService,
    RenewalsService,
    ServicesBookService,
    TicketsService,
} from "@modules/domain/crm"
import { isRecord } from "@modules/platform/primitives"
import { WS } from "./crm.builder"

/** The workspace of the second synthetic service credential (the first acts for WS of crm.builder). */
export const OTHER_WS = "6f1c2a9e-0000-4000-8000-00000000a002"

/** One REST operation (its operationId) and the domain call it makes for the workspace `ws` of the calling credential. */
export type ScopedOperation<S> = readonly [operationId: string, call: (service: S, ws: string) => Promise<unknown>]

const PAGE = { limit: 20, cursor: null }
const SOME_ID = "00000000-0000-4000-8000-000000000051"

/** The customer operations. */
export const CUSTOMER_OPERATIONS: ReadonlyArray<ScopedOperation<CustomerBookService>> = [
    ["customer.find", (s, ws) => s.search({ workspaceId: ws, q: "syn", page: PAGE })],
    ["customer.get", (s, ws) => s.get({ workspaceId: ws, code: "SYN-001" })],
    ["customer.balance.get", (s, ws) => s.balance({ workspaceId: ws, code: "SYN-001" })],
    ["customer.service.list", (s, ws) => s.listServices({ workspaceId: ws, code: "SYN-001", page: PAGE })],
    ["customer.contract.list", (s, ws) => s.listContracts({ workspaceId: ws, code: "SYN-001", page: PAGE })],
    ["customer.invoice.list", (s, ws) => s.listInvoices({ workspaceId: ws, code: "SYN-001", page: PAGE })],
    ["customer.document.list", (s, ws) => s.listDocuments({ workspaceId: ws, code: "SYN-001", page: PAGE })],
    [
        "customer.contact.update",
        (s, ws) => s.linkContact({ workspaceId: ws, code: "SYN-001", channel: "zalo", address: "z-1", name: null }),
    ],
]

/** The service operations. */
export const SERVICE_OPERATIONS: ReadonlyArray<ScopedOperation<ServicesBookService>> = [
    [
        "service.expiring.list",
        (s, ws) => s.listExpiring({ workspaceId: ws, asOf: null, withinDays: 30, includeExpired: "false", page: PAGE }),
    ],
    ["service.status.get", (s, ws) => s.status({ workspaceId: ws, code: "SYN-HOST" })],
    [
        "service.reminder.record",
        (s, ws) =>
            s.recordReminder({
                workspaceId: ws,
                code: "SYN-HOST",
                requestKey: "r-1",
                channel: "zalo",
                outcome: "sent",
                messageRef: null,
            }),
    ],
]

/** The receivable and payable operations. */
export const COLLECTION_OPERATIONS: ReadonlyArray<ScopedOperation<CollectionsService>> = [
    ["receivable.overdue.list", (s, ws) => s.listOverdue({ workspaceId: ws, asOf: null, page: PAGE })],
    [
        "receivable.notice.record",
        (s, ws) =>
            s.recordNotice({
                workspaceId: ws,
                projectCode: "P-1",
                requestKey: "n-1",
                channel: "zalo",
                messageRef: null,
            }),
    ],
    [
        "receivable.payment.record",
        (s, ws) => s.recordReceivablePayment({ workspaceId: ws, projectCode: "P-1", transactionRef: "t-1" }),
    ],
    ["payable.list", (s, ws) => s.listPayables({ workspaceId: ws, page: PAGE })],
    [
        "payable.note.record",
        (s, ws) =>
            s.recordPayableNote({
                workspaceId: ws,
                partyCode: "NCC-1",
                requestKey: "pn-1",
                invoiceNo: null,
                issuedOn: null,
                einvoiceRef: null,
                note: "n",
            }),
    ],
]

/** The price and renewal operations. */
export const RENEWAL_OPERATIONS: ReadonlyArray<ScopedOperation<RenewalsService>> = [
    ["price.list", (s, ws) => s.listPrices({ workspaceId: ws, page: PAGE })],
    [
        "renewal.quote.create",
        (s, ws) => s.quote({ workspaceId: ws, requestKey: "q-1", serviceCode: "SYN-HOST", termMonths: 12 }),
    ],
    ["renewal.get", (s, ws) => s.get({ workspaceId: ws, id: SOME_ID })],
    ["renewal.open.list", (s, ws) => s.listOpen({ workspaceId: ws, customerCode: null, page: PAGE })],
    ["renewal.payment.record", (s, ws) => s.recordPayment({ workspaceId: ws, id: SOME_ID, transactionRef: "t" })],
    [
        "service.renewal.create",
        (s, ws) =>
            s.execute({
                workspaceId: ws,
                serviceCode: "SYN-HOST",
                renewalId: SOME_ID,
                requestKey: "e-1",
                dryRun: true,
            }),
    ],
    [
        "renewal.outcome.record",
        (s, ws) =>
            s.recordOutcome({
                workspaceId: ws,
                id: SOME_ID,
                outcome: "renewed",
                newExpiresOn: "2027-12-01",
                confirmedBy: "Synthetic Staff",
                note: null,
            }),
    ],
]

/** The ticket operations. */
export const TICKET_OPERATIONS: ReadonlyArray<ScopedOperation<TicketsService>> = [
    [
        "ticket.create",
        (s, ws) =>
            s.create({
                workspaceId: ws,
                requestKey: "t-1",
                customerCode: null,
                serviceCodes: [],
                kind: "fault",
                channel: "zalo",
                sourceRef: null,
                subject: "s",
                summary: "s",
            }),
    ],
    ["ticket.get", (s, ws) => s.get({ workspaceId: ws, id: SOME_ID })],
    ["ticket.list", (s, ws) => s.list({ workspaceId: ws, customerCode: null, status: null, page: PAGE })],
    [
        "ticket.update",
        (s, ws) => s.update({ workspaceId: ws, id: SOME_ID, requestKey: "u-1", status: null, note: "n", author: "a" }),
    ],
]

/** The invoice draft operations. */
export const INVOICE_DRAFT_OPERATIONS: ReadonlyArray<ScopedOperation<InvoiceDraftsService>> = [
    ["invoice.draft.create", (s, ws) => s.create({ workspaceId: ws, renewalId: SOME_ID })],
    ["invoice.draft.get", (s, ws) => s.get({ workspaceId: ws, id: SOME_ID })],
]

/** Every operationId of the tables above: the 29 REST operations of the CRM. */
export const CRM_OPERATION_IDS: ReadonlyArray<string> = [
    ...CUSTOMER_OPERATIONS,
    ...SERVICE_OPERATIONS,
    ...COLLECTION_OPERATIONS,
    ...RENEWAL_OPERATIONS,
    ...TICKET_OPERATIONS,
    ...INVOICE_DRAFT_OPERATIONS,
].map(([id]) => id)

/** The operations that read no workspace table: the price list is the CRM's own table in code, the same for every workspace. */
export const WORKSPACE_FREE: ReadonlySet<string> = new Set(["price.list"])

/** Every value stored under a `workspaceId` key anywhere inside `value` (find options, criteria, rows, query parameters). */
const workspacesIn = (value: unknown, depth = 0): Array<unknown> => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap((item: unknown) => workspacesIn(item, depth + 1))
    if (!isRecord(value)) return []
    return Object.entries(value).flatMap(([key, inner]) =>
        key === "workspaceId" ? [inner] : workspacesIn(inner, depth + 1),
    )
}

/** A strict kit EntityManager that answers "nothing found" to every read and write, and the workspaces its statements named. */
export interface RecordingManager {
    /** The double to hand the service under test. */
    readonly em: MockEntityManager
    /** Every workspace any statement named so far: entity calls by their arguments, query builders by their bound parameters. */
    readonly named: () => ReadonlyArray<unknown>
}

/** Builds a RecordingManager; the spec's own `build(em)` adds the transaction double and the service under test. */
export const recordingManager = (): RecordingManager => {
    const em = mockEntityManager()
    const seen: Array<unknown> = []
    const record = (args: ReadonlyArray<unknown>): void => {
        seen.push(...workspacesIn(args))
    }
    const builders = queueQueryBuilders(em, [{}, {}, {}, {}])
    const answering =
        <T>(answer: T) =>
        (...args: Array<unknown>): Promise<T> => {
            record(args)
            return Promise.resolve(answer)
        }
    em.find.mockImplementation(answering([]))
    em.findOne.mockImplementation(answering(null))
    em.exists.mockImplementation(answering(false))
    em.count.mockImplementation(answering(0))
    em.insert.mockImplementation(answering({ identifiers: [], generatedMaps: [], raw: [] }))
    em.update.mockImplementation(answering({ affected: 0, generatedMaps: [], raw: [] }))
    const named = (): ReadonlyArray<unknown> => [
        ...seen,
        ...builders.flatMap((fake) =>
            ["where", "andWhere", "setParameters"].flatMap((m) => workspacesIn(fake.callsOf(m))),
        ),
    ]
    return { em, named }
}

/**
 * Runs `call` once for each of the two credentials' workspaces (WS and OTHER_WS), each on a fresh RecordingManager, ignoring the
 * call's own refusal ("not found" is expected on an empty store), and answers what each run named: `[ws, named]` pairs.
 */
export const namedPerWorkspace = (
    run: (em: MockEntityManager, ws: string) => Promise<unknown>,
    workspaces: ReadonlyArray<string>,
): Promise<ReadonlyArray<readonly [string, ReadonlyArray<unknown>]>> =>
    Promise.all(
        workspaces.map(async (ws) => {
            const manager = recordingManager()
            await run(manager.em, ws).then(
                () => undefined,
                () => undefined,
            )
            return [ws, manager.named()] as const
        }),
    )

/** What a scoped operation must answer for both workspaces: it named its workspace (or reads none) and named no other. */
export const NO_STRAYS: ReadonlyArray<readonly [boolean, ReadonlyArray<unknown>]> = [
    [true, []],
    [true, []],
]

/**
 * Runs operation `id` for the credential of WS and of OTHER_WS and answers, per run, whether it named a workspace at all (or is
 * WORKSPACE_FREE) and the workspaces it named that are not the calling credential's: NO_STRAYS when the scope holds.
 */
export const straysOf = async (
    id: string,
    run: (em: MockEntityManager, ws: string) => Promise<unknown>,
): Promise<ReadonlyArray<readonly [boolean, ReadonlyArray<unknown>]>> =>
    (await namedPerWorkspace(run, [WS, OTHER_WS])).map(
        ([ws, named]) => [named.length > 0 || WORKSPACE_FREE.has(id), named.filter((n) => n !== ws)] as const,
    )

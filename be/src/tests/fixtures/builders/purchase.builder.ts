import { builder } from "@starci/jest-preset"
import { type PurchasesService, crmEntities } from "@modules/domain/crm"
import { CREATED, WS, uuid } from "./crm.builder"

/** The entity classes of the purchase tables, read from the capability's public entity list. */
const PurchaseEntity: (typeof crmEntities)[24] = crmEntities[24]
const PurchaseFollowupEntity: (typeof crmEntities)[25] = crmEntities[25]

/** A row of the Purchase table. */
type PurchaseEntity = InstanceType<typeof PurchaseEntity>
/** A row of the PurchaseFollowup table. */
type PurchaseFollowupEntity = InstanceType<typeof PurchaseFollowupEntity>
/** One row of the price table, as `price.list` answers it. */
type PriceRowView = Awaited<ReturnType<PurchasesService["listPrices"]>>["items"][number]

const stamps = { createdAt: CREATED, updatedAt: CREATED }

/** A synthetic purchase of workspace WS in state `enquiry`, from a Zalo conversation, not yet quoted. */
export const purchaseRow: (overrides?: Partial<PurchaseEntity>) => PurchaseEntity = builder<PurchaseEntity>(
    Object.assign(new PurchaseEntity(), {
        id: uuid(121),
        workspaceId: WS,
        code: "MUA-ABCDEFGH",
        state: "enquiry",
        channel: "zalo",
        sourceRef: "conv-9",
        need: "A shop website",
        contactName: "Synthetic Buyer",
        phone: "0900000009",
        email: null,
        domain: null,
        customerCode: null,
        customerId: null,
        lines: null,
        netVnd: null,
        vatRatePercent: null,
        vatVnd: null,
        totalVnd: null,
        priceSource: null,
        quotedOn: null,
        validUntil: null,
        paymentCode: null,
        transactionRef: null,
        paidAt: null,
        acceptedAt: null,
        projectCode: null,
        contractNo: null,
        note: null,
        confirmedBy: null,
        confirmedAt: null,
        sourceHash: null,
        ...stamps,
    }),
)

/** A synthetic follow-up of purchase uuid(121). */
export const followUpRow: (overrides?: Partial<PurchaseFollowupEntity>) => PurchaseFollowupEntity =
    builder<PurchaseFollowupEntity>(
        Object.assign(new PurchaseFollowupEntity(), {
            id: uuid(131),
            workspaceId: WS,
            purchaseId: uuid(121),
            day: "2026-11-11",
            channel: "zalo",
            outcome: "sent",
            messageRef: null,
            sourceHash: null,
            ...stamps,
        }),
    )

/** A synthetic price-sheet row (not the owner's prices): NEW hosting for 12 months, priced from the sheet. */
export const priceSheetRow: (overrides?: Partial<PriceRowView>) => PriceRowView = builder<PriceRowView>({
    priceCode: "new-hosting-12",
    name: "New hosting, 12 months",
    kind: "new",
    serviceClass: "hosting",
    termMonths: 12,
    setupVnd: 0,
    netVnd: 1_000_000,
    vatRatePercent: 10,
    vatVnd: 100_000,
    totalVnd: 1_100_000,
    instalmentPercents: [100],
    priceSource: "price_sheet",
})

/** A synthetic quoted purchase of workspace WS: website build plus hosting, total 11 000 000, valid until 2026-11-26. */
export const quotedPurchaseRow: (overrides?: Partial<PurchaseEntity>) => PurchaseEntity = (overrides = {}) =>
    purchaseRow({
        state: "quoted",
        lines: [
            {
                priceCode: "new-website",
                name: "Website build",
                termMonths: null,
                quantity: 1,
                unitPriceVnd: 9_000_000,
                amountVnd: 9_000_000,
            },
            {
                priceCode: "new-hosting-12",
                name: "New hosting",
                termMonths: 12,
                quantity: 1,
                unitPriceVnd: 1_000_000,
                amountVnd: 1_000_000,
            },
        ],
        netVnd: 10_000_000,
        vatRatePercent: 10,
        vatVnd: 1_000_000,
        totalVnd: 11_000_000,
        priceSource: "price_sheet",
        quotedOn: "2026-11-12",
        validUntil: "2026-11-26",
        ...overrides,
    })

/** A page cursor of `list` after the keys `keys`, in the form the pagination capability reads. */
export const cursorOf = (list: string, keys: ReadonlyArray<string>): string =>
    Buffer.from(JSON.stringify({ l: list, k: keys }), "utf8").toString("base64url")

/** A synthetic quoted purchase of customer uuid(1), paid (an invoice can be drafted for it). */
export const paidPurchaseRow = (overrides: Partial<PurchaseEntity> = {}): PurchaseEntity =>
    quotedPurchaseRow({ state: "paid", customerId: uuid(1), ...overrides })

/** A synthetic paid purchase whose quote kept no VAT rate and no price source (a draft takes the placeholder ones). */
export const unpricedPaidPurchaseRow = (): PurchaseEntity =>
    paidPurchaseRow({ vatRatePercent: null, priceSource: null })

/** A synthetic purchase and its follow-up as items of the data repository's format @1 (no quote, no real record). */
export const PURCHASE_SNAPSHOT_ITEMS: Readonly<Record<string, ReadonlyArray<object>>> = {
    purchases: [
        {
            code: "MUA-ABCDEFGH",
            state: "enquiry",
            channel: "zalo",
            sourceRef: "conv-9",
            need: "A site",
            contactName: null,
            phone: null,
            email: null,
            domain: null,
            customerCode: "SYN-001",
            quote: null,
            paymentCode: null,
            transactionRef: null,
            paidAt: null,
            acceptedAt: null,
            projectCode: null,
            contractNo: null,
            note: null,
            confirmedBy: null,
            confirmedAt: null,
        },
    ],
    "purchase-followups": [
        { purchaseCode: "MUA-ABCDEFGH", day: "2026-11-11", channel: "zalo", outcome: "sent", messageRef: null },
    ],
}

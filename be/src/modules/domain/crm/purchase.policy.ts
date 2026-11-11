import { addDays } from "@modules/platform/primitives"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { paymentCodeOf } from "./price.policy"
import { suffixOf } from "./purchase-records.mapper"
import type { ServiceClass } from "./service.contracts"
import type { PurchaseEntity, PurchaseFollowupEntity } from "./persistence/entities"
import type {
    FollowUpView,
    PurchaseLineValue,
    PurchaseState,
    PurchaseSummaryView,
    PurchaseUpdateInput,
    PurchaseView,
    QuoteItemInput,
    QuoteView,
} from "./purchase.contracts"
import type { PriceRowView } from "./renewal.contracts"

/** The states of a purchase that is still open (a new enquiry of the same source answers it instead of opening another). */
export const OPEN_PURCHASE_STATES: ReadonlyArray<PurchaseState> = [
    "enquiry",
    "quoted",
    "awaiting_payment",
    "paid",
    "pending_person",
]

/** The states in which the need and the contact may still change, and the purchase may be lost. */
export const EDITABLE_PURCHASE_STATES: ReadonlyArray<PurchaseState> = ["enquiry", "quoted"]

/** How many days a quote holds. */
export const QUOTE_VALID_DAYS = 14

/** The most a line may count. */
const QUANTITY_MAX = 100

/** Refuses a step the purchase's state does not allow. */
export const assertState = (purchase: PurchaseEntity, allowed: ReadonlyArray<PurchaseState>): void => {
    if (!allowed.includes(purchase.state)) {
        throw new CrmError({ code: CrmErrorCode.PurchaseStateRefused, params: { state: purchase.state } })
    }
}

/** The line of one asked item, priced from its row; a missing row, another term or a placeholder price is refused. */
const lineOf = (
    table: ReadonlyArray<PriceRowView>,
    item: QuoteItemInput,
): PurchaseLineValue & { readonly row: PriceRowView } => {
    const row = table.find((candidate) => candidate.priceCode === item.priceCode)
    if (row === undefined || (item.termMonths !== null && item.termMonths !== row.termMonths)) {
        throw new CrmError({ code: CrmErrorCode.PriceNotFound, params: { priceCode: item.priceCode } })
    }
    if (row.priceSource === "placeholder") {
        throw new CrmError({ code: CrmErrorCode.PricePlaceholder, params: { priceCode: item.priceCode } })
    }
    const quantity = Math.min(Math.max(item.quantity ?? 1, 1), QUANTITY_MAX)
    const unitPriceVnd = row.setupVnd + row.netVnd
    return {
        priceCode: row.priceCode,
        name: row.name,
        termMonths: row.termMonths,
        quantity,
        unitPriceVnd,
        amountVnd: unitPriceVnd * quantity,
        row,
    }
}

/** The quote of the asked items from the price table, dated `today` and valid QUOTE_VALID_DAYS. */
export const quoteOf = (
    table: ReadonlyArray<PriceRowView>,
    items: ReadonlyArray<QuoteItemInput>,
    today: string,
): QuoteView => {
    const priced = items.map((item) => lineOf(table, item))
    const vatRatePercent = priced[0]?.row.vatRatePercent ?? 0
    const netVnd = priced.reduce((sum, line) => sum + line.amountVnd, 0)
    const vatVnd = Math.round((netVnd * vatRatePercent) / 100)
    return {
        lines: priced.map(({ row: _row, ...line }) => line),
        netVnd,
        vatRatePercent,
        vatVnd,
        totalVnd: netVnd + vatVnd,
        priceSource: "price_sheet",
        quotedOn: today,
        validUntil: addDays(today, QUOTE_VALID_DAYS),
    }
}

/** The first instalment of a quote: the first instalment percent of its website row, else the whole total. */
export const firstInstalmentOf = (table: ReadonlyArray<PriceRowView>, purchase: PurchaseEntity): number => {
    const website = table.find(
        (row) =>
            row.serviceClass === "website" && (purchase.lines ?? []).some((line) => line.priceCode === row.priceCode),
    )
    const percent = website?.instalmentPercents[0] ?? 100
    return Math.round(((purchase.totalVnd ?? 0) * percent) / 100)
}

/** A stored quote as shown, or null before the first quote. */
const quoteViewOf = (purchase: PurchaseEntity): QuoteView | null =>
    purchase.lines === null ||
    purchase.netVnd === null ||
    purchase.vatVnd === null ||
    purchase.totalVnd === null ||
    purchase.quotedOn === null ||
    purchase.validUntil === null
        ? null
        : {
              lines: purchase.lines,
              netVnd: purchase.netVnd,
              vatRatePercent: purchase.vatRatePercent ?? 0,
              vatVnd: purchase.vatVnd,
              totalVnd: purchase.totalVnd,
              priceSource: purchase.priceSource ?? "placeholder",
              quotedOn: purchase.quotedOn,
              validUntil: purchase.validUntil,
          }

/** A follow-up as shown. */
const followUpViewOf = (row: PurchaseFollowupEntity): FollowUpView => ({
    day: row.day,
    channel: row.channel,
    outcome: row.outcome,
    messageRef: row.messageRef,
})

/** A purchase as shown, with its follow-ups by day. */
export const purchaseViewOf = (
    purchase: PurchaseEntity,
    followUps: ReadonlyArray<PurchaseFollowupEntity>,
): PurchaseView => ({
    id: purchase.id,
    code: purchase.code,
    state: purchase.state,
    channel: purchase.channel,
    sourceRef: purchase.sourceRef,
    need: purchase.need,
    contactName: purchase.contactName,
    phone: purchase.phone,
    email: purchase.email,
    domain: purchase.domain,
    customerCode: purchase.customerCode,
    quote: quoteViewOf(purchase),
    paymentCode: purchase.paymentCode,
    transactionRef: purchase.transactionRef,
    paidAt: purchase.paidAt === null ? null : purchase.paidAt.toISOString(),
    acceptedAt: purchase.acceptedAt === null ? null : purchase.acceptedAt.toISOString(),
    projectCode: purchase.projectCode,
    contractNo: purchase.contractNo,
    note: purchase.note,
    followUps: followUps.toSorted((left, right) => (left.day < right.day ? -1 : 1)).map((row) => followUpViewOf(row)),
})

/** An open purchase in the list, with the facts of its follow-ups. */
export const purchaseSummaryOf = (
    purchase: PurchaseEntity,
    followUps: ReadonlyArray<PurchaseFollowupEntity>,
): PurchaseSummaryView => {
    const last = followUps.toSorted((left, right) => (left.day < right.day ? 1 : -1))[0]
    return {
        id: purchase.id,
        code: purchase.code,
        state: purchase.state,
        channel: purchase.channel,
        sourceRef: purchase.sourceRef,
        customerCode: purchase.customerCode,
        quotedOn: purchase.quotedOn,
        validUntil: purchase.validUntil,
        lastFollowUpOn: last?.day ?? null,
        followUpCount: followUps.length,
        openFollowUp: last?.outcome === "sent",
        reachable: purchase.phone !== null || purchase.email !== null,
    }
}

/** The columns a `purchase.update` changes: what it names (a null leaves the column as it is), and `lost` with its note. */
export const purchaseEditsOf = (input: PurchaseUpdateInput): Partial<PurchaseEntity> => ({
    ...(input.need === null ? {} : { need: input.need }),
    ...(input.contactName === null ? {} : { contactName: input.contactName }),
    ...(input.phone === null ? {} : { phone: input.phone }),
    ...(input.email === null ? {} : { email: input.email }),
    ...(input.domain === null ? {} : { domain: input.domain }),
    ...(input.state === null ? {} : { state: input.state, note: input.note }),
})

/** The codes of the records an acceptance opens. */
export interface OpenedRecords {
    /** The project, when the quote builds a website. */
    readonly projectCode: string | null
    /** The project code the receivable is kept under (the project's, else one of the purchase's own). */
    readonly receivableProject: string
    /** The contract record. */
    readonly contractNo: string
    /** One service per class line of the quote: its code and class (a line whose row left the table opens none). */
    readonly serviceClasses: ReadonlyArray<readonly [string, ServiceClass]>
    /** The transfer code of the first instalment. */
    readonly paymentCode: string
}

/** The codes an acceptance opens: a project when the quote builds a website, one service per class line, a contract, a payment code. */
export const openedRecordsOf = (purchase: PurchaseEntity, table: ReadonlyArray<PriceRowView>): OpenedRecords => {
    const suffix = suffixOf(purchase.code)
    const classes = (purchase.lines ?? []).flatMap((line) => {
        const row = table.find((candidate) => candidate.priceCode === line.priceCode)
        return row === undefined ? [] : [row.serviceClass]
    })
    const serviceClasses = classes
        .flatMap((serviceClass) => (serviceClass === "website" ? [] : [serviceClass]))
        .map((serviceClass, index) => [`${purchase.code}-${String(index + 1)}`, serviceClass] as const)
    const projectCode = classes.includes("website") ? `P-${suffix}` : null
    return {
        projectCode,
        receivableProject: projectCode ?? `P-${suffix}`,
        contractNo: `HD-${suffix}`,
        serviceClasses,
        paymentCode: paymentCodeOf(purchase.id, "MH"),
    }
}

import { createHash } from "node:crypto"
import type { PriceRowView, PriceView } from "./renewal.contracts"
import type { ServiceClass } from "./service.contracts"

/**
 * PLACEHOLDER price table (2026-11-12): NOT the owner's prices. Net VND per 12 months, VAT excluded. It stands until the owner's price
 * sheet is loaded (AGENTS-GRAPHS.md §6.5); every price and every quote made from it carries `priceSource: "placeholder"`.
 */
export const PLACEHOLDER_NET_PER_YEAR: Readonly<Record<ServiceClass, number>> = {
    hosting: 1_200_000,
    domain: 450_000,
    ssl: 600_000,
}

/** The terms the placeholder table prices, months. */
export const PLACEHOLDER_TERMS: ReadonlyArray<number> = [12, 24, 36]

/** The VAT rate of the placeholder table, percent. */
export const PLACEHOLDER_VAT_PERCENT = 10

/** The service classes in list order. */
export const SERVICE_CLASSES: ReadonlyArray<ServiceClass> = ["domain", "hosting", "ssl"]

/** The price of one class and term; null when the table has none. */
export const priceOf = (serviceClass: ServiceClass, termMonths: number): PriceView | null => {
    const perYear = PLACEHOLDER_NET_PER_YEAR[serviceClass]
    if (!PLACEHOLDER_TERMS.includes(termMonths)) return null
    const netVnd = Math.round((perYear * termMonths) / 12)
    const vatVnd = Math.round((netVnd * PLACEHOLDER_VAT_PERCENT) / 100)
    return {
        serviceClass,
        termMonths,
        netVnd,
        vatRatePercent: PLACEHOLDER_VAT_PERCENT,
        vatVnd,
        totalVnd: netVnd + vatVnd,
        priceSource: "placeholder",
    }
}

/** The PLACEHOLDER set-up price of a website build, whole VND before VAT; the owner's sheet replaces it. */
export const PLACEHOLDER_WEBSITE_SETUP = 6_000_000

/** The PLACEHOLDER instalments of a website build, percents of its total (terms as data). */
export const PLACEHOLDER_WEBSITE_INSTALMENTS: ReadonlyArray<number> = [50, 50]

/** The amounts of one price row: its term, set-up and term price. */
interface RowPrice {
    readonly termMonths: number | null
    readonly setupVnd: number
    readonly netVnd: number
}

/** One price row of the placeholder table. */
const rowOf = (
    priceCode: string,
    name: string,
    kind: PriceRowView["kind"],
    serviceClass: PriceRowView["serviceClass"],
    price: RowPrice,
    instalmentPercents: ReadonlyArray<number>,
): PriceRowView => {
    const vatVnd = Math.round(((price.setupVnd + price.netVnd) * PLACEHOLDER_VAT_PERCENT) / 100)
    return {
        priceCode,
        name,
        kind,
        serviceClass,
        termMonths: price.termMonths,
        setupVnd: price.setupVnd,
        netVnd: price.netVnd,
        vatRatePercent: PLACEHOLDER_VAT_PERCENT,
        vatVnd,
        totalVnd: price.setupVnd + price.netVnd + vatVnd,
        instalmentPercents,
        priceSource: "placeholder",
    }
}

/** The rows of one service class and term, NEW and renewal, from the placeholder table. */
const classRows = (serviceClass: ServiceClass, termMonths: number): ReadonlyArray<PriceRowView> => {
    const netVnd = Math.round((PLACEHOLDER_NET_PER_YEAR[serviceClass] * termMonths) / 12)
    const price = { termMonths, setupVnd: 0, netVnd }
    return [
        rowOf(
            `new-${serviceClass}-${String(termMonths)}`,
            `New ${serviceClass}, ${String(termMonths)} months`,
            "new",
            serviceClass,
            price,
            [100],
        ),
        rowOf(
            `renewal-${serviceClass}-${String(termMonths)}`,
            `Renewal of ${serviceClass}, ${String(termMonths)} months`,
            "renewal",
            serviceClass,
            price,
            [100],
        ),
    ]
}

/**
 * Every row of the PLACEHOLDER price table by price code: a website build (set-up, instalments as data) and, per service class
 * and term, a NEW and a renewal row. The owner's price sheet replaces it (AGENTS-GRAPHS §9.12 K-3).
 */
export const priceRows = (): ReadonlyArray<PriceRowView> =>
    [
        rowOf(
            "new-website",
            "Website build",
            "new",
            "website",
            { termMonths: null, setupVnd: PLACEHOLDER_WEBSITE_SETUP, netVnd: 0 },
            PLACEHOLDER_WEBSITE_INSTALMENTS,
        ),
        ...SERVICE_CLASSES.flatMap((serviceClass) =>
            PLACEHOLDER_TERMS.flatMap((term) => classRows(serviceClass, term)),
        ),
    ].toSorted((left, right) => (left.priceCode < right.priceCode ? -1 : 1))

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** The transfer code of a request, derived from its id: `prefix` + 8 characters without look-alikes (no I, O, 0, 1). */
export const paymentCodeOf = (requestId: string, prefix: string): string => {
    const digest = createHash("sha256").update(requestId, "utf8").digest()
    return prefix + Array.from(digest.subarray(0, 8), (byte) => ALPHABET.charAt(byte % ALPHABET.length)).join("")
}

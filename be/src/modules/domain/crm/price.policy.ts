import { createHash } from "node:crypto"
import type { PriceView } from "./renewal.contracts"
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

/** Every price of the table, ordered by class then term. */
export const priceTable = (): ReadonlyArray<PriceView> =>
    SERVICE_CLASSES.flatMap((serviceClass) => PLACEHOLDER_TERMS.flatMap((term) => priceOf(serviceClass, term) ?? []))

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** The transfer code of a renewal, derived from its id: `GH` + 8 characters without look-alikes (no I, O, 0, 1). */
export const paymentCodeOf = (renewalId: string): string => {
    const digest = createHash("sha256").update(renewalId, "utf8").digest()
    let code = "GH"
    for (let index = 0; index < 8; index += 1) code += ALPHABET[(digest[index] ?? 0) % ALPHABET.length] ?? "A"
    return code
}

/** Ho Chi Minh City is UTC+7 all year (no daylight saving). */
const HCM_OFFSET_MS = 7 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

/** The calendar day of an instant in Ho Chi Minh, `YYYY-MM-DD`. */
export const hcmDayOf = (instant: Date): string =>
    new Date(instant.getTime() + HCM_OFFSET_MS).toISOString().slice(0, 10)

/** A day plus `days` (may be negative). */
export const addDays = (day: string, days: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

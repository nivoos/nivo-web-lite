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

/** A day plus `months`, clamped to the last day of the target month (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (day: string, months: number): string => {
    const year = Number(day.slice(0, 4))
    const month = Number(day.slice(5, 7))
    const date = Number(day.slice(8, 10))
    const index = year * 12 + (month - 1) + months
    const targetYear = Math.floor(index / 12)
    const targetMonth = index % 12
    const last = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
    return new Date(Date.UTC(targetYear, targetMonth, Math.min(date, last))).toISOString().slice(0, 10)
}

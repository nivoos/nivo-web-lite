import type { PageInput } from "@modules/platform/pagination"

/** Service classes. */
export type ServiceClass = "hosting" | "domain" | "ssl"

/** Where an end date came from. */
export type ExpirySource = "provider" | "estimated" | "invoice" | "confirmed" | "none"

/** Reminder channels. */
export type ReminderChannel = "zalo" | "email" | "phone"

/** What came of a reminder. */
export type ReminderOutcome = "sent" | "quoted" | "answered" | "declined" | "no_answer"

/** A recurring service. */
export interface ServiceView {
    /** `<SITE>-HOST|TM|SSL`. */
    readonly code: string
    /** The customer. */
    readonly customerCode: string
    /** The website's domain, when linked. */
    readonly domain: string | null
    /** hosting, domain or ssl. */
    readonly serviceClass: ServiceClass
    /** tino, inet, azwebsite, manual or null. */
    readonly provider: string | null
    /** The mapped status. */
    readonly status: string
    /** The status as written. */
    readonly statusText: string | null
    /** Started on. */
    readonly startsOn: string | null
    /** Ends on. */
    readonly expiresOn: string | null
    /** Where the end date came from. */
    readonly expirySource: ExpirySource
}

/** A service on the renewal list, with the facts the renewal agent decides on (no verdict). */
export interface ExpiringServiceView extends ServiceView {
    /** Days from `asOf` to the end date (negative when expired). */
    readonly daysLeft: number
    /** True when the customer has a phone, an e-mail or a linked contact. */
    readonly reachable: boolean
    /** The Ho Chi Minh day of the last reminder. */
    readonly lastReminderOn: string | null
    /** How many reminders were recorded. */
    readonly reminderCount: number
    /** True when the last reminder still waits for the customer's answer (outcome sent or quoted). */
    readonly openReminder: boolean
    /** The open renewal request of the service, when there is one. */
    readonly openRenewalId: string | null
}

/**
 * A service's state as the CRM's books hold it (the CRM asks no provider: owner ruling R57; the state AT the provider is the provider's
 * own read, on the agent's provider account).
 */
export interface ServiceStatusView {
    /** The service. */
    readonly serviceCode: string
    /** The status the books hold (active, suspended, cancelled, pending, ...). */
    readonly status: string
    /** active or expired by the stored end date on today's date in Ho Chi Minh; unknown when the books hold no end date. */
    readonly state: "active" | "expired" | "unknown"
    /** The end date the books hold. */
    readonly expiresOn: string | null
    /** Where that end date came from (provider, estimated, invoice, confirmed, none). */
    readonly expirySource: ExpirySource
}

/** A reminder recorded about a service. */
export interface ReminderView {
    /** The row id. */
    readonly id: string
    /** The service. */
    readonly serviceCode: string
    /** The channel. */
    readonly channel: ReminderChannel
    /** What came of it. */
    readonly outcome: ReminderOutcome
    /** The channel's message id. */
    readonly messageRef: string | null
    /** When it was sent. */
    readonly sentAt: string
}

/** Whether the renewal list includes services past their end date, as the query names it. */
export type ExpiredFlag = "true" | "false"

/** The renewal list. */
export interface ExpiringInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The reference day; today in Ho Chi Minh when absent. */
    readonly asOf: string | null
    /** Window after asOf, days. */
    readonly withinDays: number
    /** Include services already past their end date. */
    readonly includeExpired: ExpiredFlag
    /** The page. */
    readonly page: PageInput
}

/** Names one service. */
export interface ServiceKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The service code. */
    readonly code: string
}

/** Records a reminder. */
export interface ReminderRecordInput extends ServiceKey {
    /** The replay key. */
    readonly requestKey: string
    /** The channel. */
    readonly channel: ReminderChannel
    /** What came of it. */
    readonly outcome: ReminderOutcome
    /** The channel's message id. */
    readonly messageRef: string | null
}

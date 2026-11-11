import type { PageInput } from "@modules/platform/pagination"

/** Ticket kinds. */
export type TicketKind = "fault" | "complaint" | "question" | "request"

/** Ticket statuses. */
export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "quoted" | "resolved" | "closed"

/** Ticket channels. */
export type TicketChannel = "zalo" | "email" | "phone" | "chat"

/** A note or a status change. */
export interface TicketNoteView {
    /** The id. */
    readonly id: string
    /** The note. */
    readonly body: string | null
    /** The status before a change. */
    readonly statusFrom: TicketStatus | null
    /** The status after a change. */
    readonly statusTo: TicketStatus | null
    /** Who wrote it. */
    readonly author: string
    /** When. */
    readonly createdAt: string
}

/** A ticket as a list shows it. */
export interface TicketSummaryView {
    /** The id. */
    readonly id: string
    /** The customer, when known. */
    readonly customerCode: string | null
    /** The services it concerns. */
    readonly serviceCodes: ReadonlyArray<string>
    /** The kind. */
    readonly kind: TicketKind
    /** The status. */
    readonly status: TicketStatus
    /** The channel it came from. */
    readonly channel: TicketChannel
    /** The conversation or mail id. */
    readonly sourceRef: string | null
    /** One line. */
    readonly subject: string
    /** When it was opened. */
    readonly openedAt: string
    /** When it was closed. */
    readonly closedAt: string | null
}

/** One ticket with its summary and notes. */
export interface TicketView extends TicketSummaryView {
    /** What the customer reported. */
    readonly summary: string
    /** Its notes, oldest first (at most 100). */
    readonly notes: ReadonlyArray<TicketNoteView>
}

/** Opens a ticket. */
export interface TicketCreateInput {
    /** The workspace. */
    readonly workspaceId: string
    /** The replay key (conversation + first message id). */
    readonly requestKey: string
    /** The customer, when known. */
    readonly customerCode: string | null
    /** The services it concerns. */
    readonly serviceCodes: ReadonlyArray<string>
    /** The kind. */
    readonly kind: TicketKind
    /** The channel. */
    readonly channel: TicketChannel
    /** The conversation or mail id. */
    readonly sourceRef: string | null
    /** One line. */
    readonly subject: string
    /** What the customer reported. */
    readonly summary: string
}

/** Names one ticket. */
export interface TicketKey {
    /** The workspace. */
    readonly workspaceId: string
    /** The ticket id. */
    readonly id: string
}

/** Lists tickets, newest first. */
export interface TicketListInput {
    /** The workspace. */
    readonly workspaceId: string
    /** Only this customer's. */
    readonly customerCode: string | null
    /** Only this status. */
    readonly status: TicketStatus | null
    /** The page. */
    readonly page: PageInput
}

/** Adds a note and/or changes the status. */
export interface TicketUpdateInput extends TicketKey {
    /** The replay key. */
    readonly requestKey: string
    /** The new status. */
    readonly status: TicketStatus | null
    /** The note. */
    readonly note: string | null
    /** Who writes. */
    readonly author: string
}

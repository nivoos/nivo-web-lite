import { z } from "zod"
import { type CrmObject, objectsMember, textMember, textsMember } from "./crm-calls.ts"

export const TICKET_KINDS = ["fault", "complaint", "question", "request"] as const
export const TICKET_CHANNELS = ["zalo", "email", "phone", "chat"] as const
export const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "quoted", "resolved", "closed"] as const

/** A ticket as the CRM keeps it, without its notes (a list row). */
export const TicketRowOut = z.strictObject({
    id: z.string().min(1).max(255),
    customerCode: z.string().max(2000).nullable(),
    serviceCodes: z.array(z.string().max(255)).max(1000),
    kind: z.enum(TICKET_KINDS),
    status: z.enum(TICKET_STATUSES),
    channel: z.enum(TICKET_CHANNELS),
    sourceRef: z.string().max(2000).nullable(),
    subject: z.string().max(2000),
    openedAt: z.string().max(2000),
    closedAt: z.string().max(2000).nullable(),
})

export const TicketNoteOut = z.strictObject({
    author: z.string().max(2000),
    body: z.string().max(20000).nullable(),
    statusFrom: z.enum(TICKET_STATUSES).nullable(),
    statusTo: z.enum(TICKET_STATUSES).nullable(),
    createdAt: z.string().max(2000),
})

/** One ticket with its summary and notes. */
export const TicketOut = TicketRowOut.extend({ summary: z.string().max(2000), notes: z.array(TicketNoteOut).max(1000) })

const oneOf = <T extends string>(values: ReadonlyArray<T>, value: string | null): T | null =>
    values.find((each) => each === value) ?? null

/** A list row of the CRM answer, or null when it is not the contract's shape. */
export const ticketRowOf = (source: CrmObject): z.infer<typeof TicketRowOut> | null => {
    const id = textMember(source, "id")
    const kind = oneOf(TICKET_KINDS, textMember(source, "kind"))
    const status = oneOf(TICKET_STATUSES, textMember(source, "status"))
    const channel = oneOf(TICKET_CHANNELS, textMember(source, "channel"))
    const subject = textMember(source, "subject")
    const openedAt = textMember(source, "openedAt")
    const serviceCodes = textsMember(source, "serviceCodes")
    if (
        id === null ||
        kind === null ||
        status === null ||
        channel === null ||
        subject === null ||
        openedAt === null ||
        serviceCodes === null
    )
        return null
    return {
        id,
        customerCode: textMember(source, "customerCode"),
        serviceCodes: [...serviceCodes],
        kind,
        status,
        channel,
        sourceRef: textMember(source, "sourceRef"),
        subject,
        openedAt,
        closedAt: textMember(source, "closedAt"),
    }
}

/** A whole ticket of the CRM answer, or null. */
export const ticketOf = (source: CrmObject): z.infer<typeof TicketOut> | null => {
    const row = ticketRowOf(source)
    const summary = textMember(source, "summary")
    const noteObjects = objectsMember(source, "notes")
    if (row === null || summary === null || noteObjects === null) return null
    const notes: Array<z.infer<typeof TicketNoteOut>> = []
    for (const each of noteObjects) {
        const author = textMember(each, "author")
        const createdAt = textMember(each, "createdAt")
        if (author === null || createdAt === null) return null
        notes.push({
            author,
            body: textMember(each, "body"),
            statusFrom: oneOf(TICKET_STATUSES, textMember(each, "statusFrom")),
            statusTo: oneOf(TICKET_STATUSES, textMember(each, "statusTo")),
            createdAt,
        })
    }
    return { ...row, summary, notes }
}

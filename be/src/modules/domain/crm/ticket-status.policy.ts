import { CrmError, CrmErrorCode } from "./errors/crm.error"
import type { TicketStatus } from "./ticket.contracts"

/** A closed ticket only reopens; every other status may move to any other. */
export const assertTicketTransition = (from: string, to: TicketStatus): void => {
    if (from === to || (from === "closed" && to !== "open")) {
        throw new CrmError({ code: CrmErrorCode.TicketTransitionRefused, params: { from, to } })
    }
}

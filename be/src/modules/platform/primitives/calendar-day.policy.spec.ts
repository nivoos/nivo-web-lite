import { Test } from "@nestjs/testing"
import { addDays, daysBetween, hcmDayOf } from "./calendar-day.policy"

const CALENDAR_DAY_POLICY: unique symbol = Symbol("calendar-day")

/** The policy under test, resolved through a testing module. */
interface CalendarDayPolicy {
    readonly addDays: typeof addDays
    readonly daysBetween: typeof daysBetween
    readonly hcmDayOf: typeof hcmDayOf
}

const policy = async (): Promise<CalendarDayPolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: CALENDAR_DAY_POLICY,
                useFactory: (): CalendarDayPolicy => ({ addDays, daysBetween, hcmDayOf }),
            },
        ],
    }).compile()
    return moduleRef.get<CalendarDayPolicy>(CALENDAR_DAY_POLICY)
}

describe("calendar day policy", () => {
    let subject: CalendarDayPolicy

    beforeEach(async () => {
        subject = await policy()
    })

    it("takes the Ho Chi Minh day of an instant (UTC+7)", () => {
        expect([
            subject.hcmDayOf(new Date("2026-11-11T16:59:59Z")),
            subject.hcmDayOf(new Date("2026-11-11T17:00:00Z")),
        ]).toEqual(["2026-11-11", "2026-11-12"])
    })

    it("adds days and counts the days between two days", () => {
        expect([
            subject.addDays("2026-12-30", 3),
            subject.addDays("2026-03-01", -1),
            subject.daysBetween("2026-11-12", "2026-12-12"),
            subject.daysBetween("2026-11-12", "2026-11-10"),
        ]).toEqual(["2027-01-02", "2026-02-28", 30, -2])
    })
})

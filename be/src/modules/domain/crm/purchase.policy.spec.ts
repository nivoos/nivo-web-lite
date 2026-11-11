import { Test } from "@nestjs/testing"
import { followUpRow, priceSheetRow, purchaseRow, quotedPurchaseRow } from "@tests/fixtures/builders/purchase.builder"
import {
    firstInstalmentOf,
    openedRecordsOf,
    purchaseEditsOf,
    purchaseSummaryOf,
    purchaseViewOf,
    quoteOf,
} from "./purchase.policy"

const PURCHASE_POLICY: unique symbol = Symbol("purchase")

/** The policy under test, resolved through a testing module. */
interface PurchasePolicy {
    readonly firstInstalmentOf: typeof firstInstalmentOf
    readonly openedRecordsOf: typeof openedRecordsOf
    readonly purchaseEditsOf: typeof purchaseEditsOf
    readonly purchaseSummaryOf: typeof purchaseSummaryOf
    readonly purchaseViewOf: typeof purchaseViewOf
    readonly quoteOf: typeof quoteOf
}

const policy = async (): Promise<PurchasePolicy> => {
    const moduleRef = await Test.createTestingModule({
        providers: [
            {
                provide: PURCHASE_POLICY,
                useFactory: (): PurchasePolicy => ({
                    firstInstalmentOf,
                    openedRecordsOf,
                    purchaseEditsOf,
                    purchaseSummaryOf,
                    purchaseViewOf,
                    quoteOf,
                }),
            },
        ],
    }).compile()
    return moduleRef.get<PurchasePolicy>(PURCHASE_POLICY)
}

const WEBSITE = priceSheetRow({
    priceCode: "new-website",
    serviceClass: "website",
    termMonths: null,
    instalmentPercents: [],
})

describe("purchase policy: quotes and instalments", () => {
    it("quotes nothing for no item, and takes the whole total as first instalment without a website row or a total", async () => {
        const subject = await policy()
        expect(subject.quoteOf([priceSheetRow()], [], "2026-11-12")).toEqual(
            expect.objectContaining({ lines: [], netVnd: 0, vatRatePercent: 0, totalVnd: 0 }),
        )
        expect([
            subject.firstInstalmentOf([WEBSITE], quotedPurchaseRow()),
            subject.firstInstalmentOf([priceSheetRow()], purchaseRow({ lines: null, totalVnd: null })),
            subject.firstInstalmentOf([WEBSITE], purchaseRow({ lines: null, totalVnd: 10 })),
        ]).toEqual([11_000_000, 0, 10])
    })
})

describe("purchase policy: views", () => {
    it("shows a quote with stored defaults, the instants as ISO text and the follow-ups by day", async () => {
        const subject = await policy()
        const at = new Date("2026-11-12T03:00:00.000Z")
        const view = subject.purchaseViewOf(
            quotedPurchaseRow({ vatRatePercent: null, priceSource: null, paidAt: at, acceptedAt: at }),
            [
                followUpRow({ day: "2026-11-12" }),
                followUpRow({ day: "2026-11-10" }),
                followUpRow({ day: "2026-11-11" }),
            ],
        )
        expect([view.quote?.vatRatePercent, view.quote?.priceSource, view.paidAt, view.acceptedAt]).toEqual([
            0,
            "placeholder",
            "2026-11-12T03:00:00.000Z",
            "2026-11-12T03:00:00.000Z",
        ])
        expect(view.followUps.map((followUp) => followUp.day)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"])
        expect(subject.purchaseViewOf(purchaseRow({ lines: [], netVnd: 1 }), []).quote).toBeNull()
    })

    it("summarises an open purchase with no follow-up, and one reachable by mail only", async () => {
        const subject = await policy()
        expect(subject.purchaseSummaryOf(purchaseRow({ phone: null, email: "b@synthetic.example" }), [])).toEqual(
            expect.objectContaining({ lastFollowUpOn: null, followUpCount: 0, openFollowUp: false, reachable: true }),
        )
        expect(
            subject.purchaseSummaryOf(purchaseRow({ phone: null }), [
                followUpRow({ day: "2026-11-09", outcome: "sent" }),
                followUpRow({ day: "2026-11-11", outcome: "answered" }),
                followUpRow({ day: "2026-11-10", outcome: "sent" }),
            ]),
        ).toEqual(expect.objectContaining({ lastFollowUpOn: "2026-11-11", openFollowUp: false, reachable: false }))
    })
})

describe("purchase policy: edits and opened records", () => {
    it("changes only what an update names, and moves to lost with its note", async () => {
        const subject = await policy()
        const none = {
            workspaceId: "w",
            id: "i",
            need: null,
            contactName: null,
            phone: null,
            email: null,
            domain: null,
            state: null,
            note: null,
        } as const
        expect([subject.purchaseEditsOf(none), subject.purchaseEditsOf({ ...none, state: "lost", note: "n" })]).toEqual(
            [{}, { state: "lost", note: "n" }],
        )
    })

    it("opens no project and no service for a line whose row left the table, and keeps the receivable under its own code", async () => {
        const subject = await policy()
        const opened = subject.openedRecordsOf(quotedPurchaseRow(), [priceSheetRow()])
        expect(opened).toEqual(
            expect.objectContaining({ projectCode: null, receivableProject: "P-ABCDEFGH", contractNo: "HD-ABCDEFGH" }),
        )
        expect([opened.serviceClasses, subject.openedRecordsOf(purchaseRow(), [WEBSITE]).serviceClasses]).toEqual([
            [["MUA-ABCDEFGH-1", "hosting"]],
            [],
        ])
    })
})

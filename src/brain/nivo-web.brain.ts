// NIVO Web's second brain as classes: each document is a Markdown file next to this file, copied from the seed standard (nivo-web-core-seed-standard
// knowledge/*.md, interim content awaiting the NIVO Web CEO's review) with the exact figures inside it. The public ones are what a customer may be told;
// `giam-gia.md` is the one internal truth of the standard's seed.json (the maximum discount), written as a document because truths come from the read job.
import { brainFile, type BrainDocument } from "@nivoos-lite/nivoos-sdk"

export class About implements BrainDocument {
    readonly key = "nivo-web.about"
    readonly area = "public"
    readonly title = { vi: "Giới thiệu NIVO Web", en: "About NIVO Web" }
    readonly source = brainFile("./gioi-thieu.md")
}

export class DomainHostingPrices implements BrainDocument {
    readonly key = "nivo-web.domain-hosting-prices"
    readonly area = "public"
    readonly title = { vi: "Bảng giá tên miền và hosting", en: "Domain and hosting prices" }
    readonly source = brainFile("./ten-mien-hosting.md")
}

export class WebsiteDesign implements BrainDocument {
    readonly key = "nivo-web.website-design"
    readonly area = "public"
    readonly title = { vi: "Thiết kế và chăm sóc website", en: "Website design and care" }
    readonly source = brainFile("./thiet-ke-website.md")
}

export class Renewals implements BrainDocument {
    readonly key = "nivo-web.renewals"
    readonly area = "public"
    readonly title = { vi: "Quy định gia hạn", en: "Renewal rules" }
    readonly source = brainFile("./gia-han.md")
}

export class PaymentInvoices implements BrainDocument {
    readonly key = "nivo-web.payment-invoices"
    readonly area = "public"
    readonly title = { vi: "Thanh toán và hóa đơn", en: "Payment and invoices" }
    readonly source = brainFile("./thanh-toan-hoa-don.md")
}

export class Support implements BrainDocument {
    readonly key = "nivo-web.support"
    readonly area = "public"
    readonly title = { vi: "Hỗ trợ kỹ thuật", en: "Technical support" }
    readonly source = brainFile("./ho-tro.md")
}

export class Discounts implements BrainDocument {
    readonly key = "nivo-web.discounts"
    readonly area = "internal"
    readonly title = { vi: "Giảm giá (nội bộ)", en: "Discounts (internal)" }
    readonly source = brainFile("./giam-gia.md")
}

/** The documents the workspace's brain starts with. */
export const NIVO_WEB_BRAIN = [About, DomainHostingPrices, WebsiteDesign, Renewals, PaymentInvoices, Support, Discounts] as const

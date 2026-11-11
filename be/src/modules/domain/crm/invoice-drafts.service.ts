import { Injectable } from "@nestjs/common"
import type { EntityManager } from "typeorm"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectMessageCatalog, type MessageCatalog } from "@modules/platform/i18n"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { CustomerEntity, InvoiceDraftEntity, RenewalRequestEntity, ServiceEntity } from "./persistence/entities"
import { PLACEHOLDER_VAT_PERCENT } from "./price.policy"
import type { InvoiceDraftCreateInput, InvoiceDraftKey, InvoiceDraftView } from "./renewal.contracts"

/** The states of a renewal an invoice can be drafted for: the customer has paid. */
const INVOICEABLE: ReadonlySet<string> = new Set(["paid", "pending_person", "renewed"])

@Injectable()
/** Invoice drafts: lines and amounts computed by the CRM from a paid renewal (data only; issuing is a later e-invoice provider). */
export class InvoiceDraftsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectIds() private readonly ids: Ids,
        @InjectMessageCatalog() private readonly catalog: MessageCatalog,
    ) {}

    /** Drafts the invoice of a paid renewal; one draft per renewal, so a repeat answers the same draft. */
    create(input: InvoiceDraftCreateInput): Promise<InvoiceDraftView> {
        return this.entityManager.transaction(async (manager) => {
            const stored = await manager.findOne(InvoiceDraftEntity, {
                where: { workspaceId: input.workspaceId, renewalId: input.renewalId },
            })
            if (stored !== null) return this.viewOf(manager, stored)
            const renewal = await manager.findOne(RenewalRequestEntity, {
                where: { workspaceId: input.workspaceId, id: input.renewalId },
            })
            if (renewal === null) throw new CrmError({ code: CrmErrorCode.RenewalNotFound })
            if (
                !INVOICEABLE.has(renewal.state) ||
                renewal.netVnd === null ||
                renewal.vatVnd === null ||
                renewal.totalVnd === null
            ) {
                throw new CrmError({ code: CrmErrorCode.RenewalStateRefused, params: { state: renewal.state } })
            }
            const service = await manager.findOne(ServiceEntity, {
                where: { workspaceId: input.workspaceId, id: renewal.serviceId },
            })
            if (service === null) throw new CrmError({ code: CrmErrorCode.ServiceNotFound })
            const row = manager.create(InvoiceDraftEntity, {
                id: this.ids.next(),
                workspaceId: input.workspaceId,
                renewalId: renewal.id,
                customerId: service.customerId,
                lines: [
                    {
                        description: this.lineOf(service.serviceClass, service.code, renewal.termMonths),
                        quantity: 1,
                        unitPriceVnd: renewal.netVnd,
                        amountVnd: renewal.netVnd,
                    },
                ],
                netVnd: renewal.netVnd,
                vatRatePercent: PLACEHOLDER_VAT_PERCENT,
                vatVnd: renewal.vatVnd,
                totalVnd: renewal.totalVnd,
                state: "draft",
                priceSource: renewal.priceSource,
            })
            await manager.insert(InvoiceDraftEntity, row)
            return this.viewOf(manager, row)
        })
    }

    /** One draft. */
    async get(key: InvoiceDraftKey): Promise<InvoiceDraftView> {
        const draft = await this.entityManager.findOne(InvoiceDraftEntity, {
            where: { workspaceId: key.workspaceId, id: key.id },
        })
        if (draft === null) throw new CrmError({ code: CrmErrorCode.InvoiceDraftNotFound })
        return this.viewOf(this.entityManager, draft)
    }

    /** The invoice line of a renewal, in Vietnamese (a VAT invoice's language), from the messages catalog. */
    private lineOf(serviceClass: string, serviceCode: string, termMonths: number): string {
        const label = this.catalog.get(`crm.service-class.${serviceClass}`, {}, "vi")
        return this.catalog.get(
            "crm.invoice-draft.renewal-line",
            { serviceClass: label, serviceCode, termMonths },
            "vi",
        )
    }

    private async viewOf(manager: EntityManager, draft: InvoiceDraftEntity): Promise<InvoiceDraftView> {
        const customer = await manager.findOne(CustomerEntity, {
            where: { workspaceId: draft.workspaceId, id: draft.customerId },
        })
        return {
            id: draft.id,
            renewalId: draft.renewalId,
            customerCode: customer?.code ?? "",
            lines: draft.lines,
            netVnd: draft.netVnd,
            vatRatePercent: draft.vatRatePercent,
            vatVnd: draft.vatVnd,
            totalVnd: draft.totalVnd,
            state: "draft",
            priceSource: draft.priceSource,
        }
    }
}

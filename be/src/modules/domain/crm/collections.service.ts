import { Injectable } from "@nestjs/common"
import { type EntityManager, type FindOptionsWhere, In, IsNull, LessThan, MoreThan } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Page, decodeCursor, pageOf, pageSizeOf } from "@modules/platform/pagination"
import { hcmDayOf } from "@modules/platform/primitives"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { isoOf } from "./crm.mapper"
import {
    CustomerEntity,
    LedgerBalanceEntity,
    PayableNoteEntity,
    ReceivableEntity,
    ReceivableNoticeEntity,
    ReceivablePaymentEntity,
    RenewalRequestEntity,
} from "./persistence/entities"
import { type FactRow, factRowsOf, factsById } from "./raw-row.policy"
import { isReplay, requestHashOf } from "./request-key.policy"
import type { ReceivableView } from "./customer.contracts"
import type {
    NoticeRecordInput,
    NoticeView,
    OverdueInput,
    PayableListInput,
    PayableNoteInput,
    PayableNoteView,
    PayableView,
    ReceivablePaymentInput,
    ReceivablePaymentView,
} from "./collection.contracts"

/** The overdue list's keyset name. */
const OVERDUE_LIST = "receivable.overdue.list"

/** The payables list's keyset name. */
const PAYABLE_LIST = "payable.list"

@Injectable()
/**
 * Collections: the REAL receivables (projects' unpaid amounts) with their notices and recorded payments, and the TK331 payables with
 * the supplier invoices noted against them. A TK131 balance is never a debt here. Payments are recorded by the bank row's reference,
 * never by an amount, and do not change the imported books.
 */
export class CollectionsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
    ) {}

    /** Receivables with remaining > 0 that are past due on `asOf`, plus the undated ones, by project code. */
    async listOverdue(input: OverdueInput): Promise<Page<ReceivableView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(OVERDUE_LIST, input.page.cursor, 1)?.[0]
        const asOf = input.asOf ?? hcmDayOf(this.clock.now())
        const base: FindOptionsWhere<ReceivableEntity> = {
            workspaceId: input.workspaceId,
            remainingVnd: MoreThan(0),
            ...(after === undefined ? {} : { projectCode: MoreThan(after) }),
        }
        const rows = await this.entityManager.find(ReceivableEntity, {
            where: [
                { ...base, dueOn: LessThan(asOf) },
                { ...base, dueOn: IsNull() },
            ],
            order: { projectCode: "ASC" },
            take: limit + 1,
        })
        const views = await this.receivableViews(input.workspaceId, rows.slice(0, limit))
        return pageOf(
            OVERDUE_LIST,
            rows,
            limit,
            (row) => [row.projectCode],
            rows.slice(0, limit).flatMap((row) => views.get(row.id) ?? []),
        )
    }

    /** The views of receivables with their customer codes, notice facts and payment counts (one read per kind, never per row). */
    async receivableViews(
        workspaceId: string,
        rows: ReadonlyArray<ReceivableEntity>,
    ): Promise<ReadonlyMap<string, ReceivableView>> {
        if (rows.length === 0) return new Map<string, never>()
        const ids = rows.map((row) => row.id)
        const customerIds = [...new Set(rows.flatMap((row) => (row.customerId === null ? [] : [row.customerId])))]
        const customers =
            customerIds.length === 0
                ? []
                : await this.entityManager.find(CustomerEntity, {
                      where: { workspaceId, id: In(customerIds) },
                      take: customerIds.length,
                  })
        const codes = new Map(customers.map((customer) => [customer.id, customer.code]))
        const notices = factsById(
            factRowsOf(
                await this.entityManager
                    .createQueryBuilder(ReceivableNoticeEntity, "n")
                    .select("n.receivable_id", "id")
                    .addSelect("count(*)", "count")
                    .addSelect("max(n.sent_at)", "last")
                    .where("n.workspace_id = :workspaceId", { workspaceId })
                    .andWhere("n.receivable_id IN (:...ids)", { ids })
                    .groupBy("n.receivable_id")
                    .getRawMany(),
            ),
        )
        const payments = factsById(
            factRowsOf(
                await this.entityManager
                    .createQueryBuilder(ReceivablePaymentEntity, "p")
                    .select("p.receivable_id", "id")
                    .addSelect("count(*)", "count")
                    .where("p.workspace_id = :workspaceId", { workspaceId })
                    .andWhere("p.receivable_id IN (:...ids)", { ids })
                    .groupBy("p.receivable_id")
                    .getRawMany(),
            ),
        )
        return new Map(
            rows.map((row) => {
                const notice = notices.get(row.id)
                const view: ReceivableView = {
                    projectCode: row.projectCode,
                    customerCode: row.customerId === null ? null : (codes.get(row.customerId) ?? null),
                    contractRef: row.contractRef,
                    totalVnd: row.totalVnd,
                    collectedVnd: row.collectedVnd,
                    remainingVnd: row.remainingVnd,
                    dueOn: row.dueOn,
                    projectState: row.projectState,
                    lastNoticeOn: notice?.last === null || notice === undefined ? null : hcmDayOf(notice.last),
                    noticeCount: notice?.count ?? 0,
                    paymentCount: payments.get(row.id)?.count ?? 0,
                }
                return [row.id, view]
            }),
        )
    }

    /** Records a notice sent about a receivable; a repeat of the key answers the first record. */
    recordNotice(input: NoticeRecordInput): Promise<NoticeView> {
        const hash = requestHashOf({
            operation: "receivable.notice.record",
            projectCode: input.projectCode,
            channel: input.channel,
            messageRef: input.messageRef,
        })
        return this.entityManager.transaction(async (manager) => {
            const stored = await this.storedNotice(manager, input)
            if (stored !== null && isReplay(stored, hash)) return this.noticeView(stored, input.projectCode)
            const receivable = await this.receivableOf(manager, input.workspaceId, input.projectCode)
            const row = manager.create(ReceivableNoticeEntity, {
                id: this.ids.next(),
                workspaceId: input.workspaceId,
                receivableId: receivable.id,
                channel: input.channel,
                messageRef: input.messageRef,
                sentAt: this.clock.now(),
                requestKey: input.requestKey,
                requestHash: hash,
            })
            await manager.insert(ReceivableNoticeEntity, row)
            return this.noticeView(row, input.projectCode)
        })
    }

    /** Records a payment of a receivable by the bank row's id; the same id again answers the first record; an id used elsewhere is refused. */
    recordReceivablePayment(input: ReceivablePaymentInput): Promise<ReceivablePaymentView> {
        return this.entityManager.transaction(async (manager) => {
            const receivable = await this.receivableOf(manager, input.workspaceId, input.projectCode)
            const stored = await manager.findOne(ReceivablePaymentEntity, {
                where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
            })
            if (stored !== null) {
                if (stored.receivableId !== receivable.id) throw new CrmError({ code: CrmErrorCode.TransactionUsed })
                return this.paymentView(stored, input.projectCode)
            }
            if (
                await manager.exists(RenewalRequestEntity, {
                    where: { workspaceId: input.workspaceId, transactionRef: input.transactionRef },
                })
            ) {
                throw new CrmError({ code: CrmErrorCode.TransactionUsed })
            }
            const row = manager.create(ReceivablePaymentEntity, {
                id: this.ids.next(),
                workspaceId: input.workspaceId,
                receivableId: receivable.id,
                transactionRef: input.transactionRef,
                recordedAt: this.clock.now(),
            })
            await manager.insert(ReceivablePaymentEntity, row)
            return this.paymentView(row, input.projectCode)
        })
    }

    /** The TK331 parties with their balances and supplier invoice notes, by party code. */
    async listPayables(input: PayableListInput): Promise<Page<PayableView>> {
        const limit = pageSizeOf(input.page.limit)
        const after = decodeCursor(PAYABLE_LIST, input.page.cursor, 1)?.[0]
        const rows = await this.entityManager.find(LedgerBalanceEntity, {
            where: {
                workspaceId: input.workspaceId,
                account: "331",
                ...(after === undefined ? {} : { partyCode: MoreThan(after) }),
            },
            order: { partyCode: "ASC" },
            take: limit + 1,
        })
        const codes = rows.slice(0, limit).map((row) => row.partyCode)
        const notes =
            codes.length === 0
                ? new Map<string, FactRow>()
                : factsById(
                      factRowsOf(
                          await this.entityManager
                              .createQueryBuilder(PayableNoteEntity, "n")
                              .select("n.party_code", "id")
                              .addSelect("count(*)", "count")
                              .addSelect("max(n.recorded_at)", "last")
                              .addSelect("(array_agg(n.invoice_no ORDER BY n.recorded_at DESC))[1]", "latest")
                              .where("n.workspace_id = :workspaceId", { workspaceId: input.workspaceId })
                              .andWhere("n.party_code IN (:...codes)", { codes })
                              .groupBy("n.party_code")
                              .getRawMany(),
                      ),
                  )
        return pageOf(
            PAYABLE_LIST,
            rows,
            limit,
            (row) => [row.partyCode],
            rows.slice(0, limit).map((row) => ({
                partyCode: row.partyCode,
                partyName: row.partyName,
                closingCreditVnd: row.closingCreditVnd,
                closingDebitVnd: row.closingDebitVnd,
                noteCount: notes.get(row.partyCode)?.count ?? 0,
                lastNoteInvoiceNo: notes.get(row.partyCode)?.latest ?? null,
            })),
        )
    }

    /** Notes a supplier invoice against a TK331 party; a repeat of the key answers the first note. */
    recordPayableNote(input: PayableNoteInput): Promise<PayableNoteView> {
        const { workspaceId, requestKey, ...request } = input
        const hash = requestHashOf({ operation: "payable.note.record", ...request })
        return this.entityManager.transaction(async (manager) => {
            const stored = await manager.findOne(PayableNoteEntity, { where: { workspaceId, requestKey } })
            if (stored !== null && isReplay(stored, hash)) return this.noteView(stored)
            if (
                !(await manager.exists(LedgerBalanceEntity, {
                    where: { workspaceId, account: "331", partyCode: input.partyCode },
                }))
            ) {
                throw new CrmError({ code: CrmErrorCode.PayableNotFound })
            }
            const row = manager.create(PayableNoteEntity, {
                id: this.ids.next(),
                workspaceId,
                partyCode: input.partyCode,
                invoiceNo: input.invoiceNo,
                issuedOn: input.issuedOn,
                einvoiceRef: input.einvoiceRef,
                note: input.note,
                recordedAt: this.clock.now(),
                requestKey,
                requestHash: hash,
            })
            await manager.insert(PayableNoteEntity, row)
            return this.noteView(row)
        })
    }

    /** The notice already recorded under the request's key, if any. */
    private storedNotice(manager: EntityManager, input: NoticeRecordInput): Promise<ReceivableNoticeEntity | null> {
        return manager.findOne(ReceivableNoticeEntity, {
            where: { workspaceId: input.workspaceId, requestKey: input.requestKey },
        })
    }

    private async receivableOf(
        manager: EntityManager,
        workspaceId: string,
        projectCode: string,
    ): Promise<ReceivableEntity> {
        const receivable = await manager.findOne(ReceivableEntity, { where: { workspaceId, projectCode } })
        if (receivable === null) throw new CrmError({ code: CrmErrorCode.ReceivableNotFound })
        return receivable
    }

    private noticeView(row: ReceivableNoticeEntity, projectCode: string): NoticeView {
        return {
            id: row.id,
            projectCode,
            channel: row.channel,
            messageRef: row.messageRef,
            sentAt: isoOf(row.sentAt),
        }
    }

    private paymentView(row: ReceivablePaymentEntity, projectCode: string): ReceivablePaymentView {
        return { id: row.id, projectCode, transactionRef: row.transactionRef, recordedAt: isoOf(row.recordedAt) }
    }

    private noteView(row: PayableNoteEntity): PayableNoteView {
        return {
            id: row.id,
            partyCode: row.partyCode,
            invoiceNo: row.invoiceNo,
            issuedOn: row.issuedOn,
            einvoiceRef: row.einvoiceRef,
            note: row.note,
            recordedAt: isoOf(row.recordedAt),
        }
    }
}

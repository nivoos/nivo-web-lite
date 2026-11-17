-- NIVO Web dev sample, 7 of 7: the books. Website projects with the money still to collect (the real receivables: some overdue, some
-- not yet due), the notices sent about them and the payments recorded against them; supplier balances and notes; the issued VAT
-- invoices of the books; and the invoice drafts of paid renewals and deals: a draft waits for the accountant's issue approval, an
-- issued one carries the number and reference the e-invoice provider gave. Money is whole VND, VAT 10%. Days are how long ago.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_projects
    (workspace_id, code, customer_id, website_id, name, contract_no, contract_state, value_vnd, collected_vnd, remaining_vnd, starts_on, ends_on,
     status_text, note, source_file, source_sheet, source_row, source_hash)
select
    w.workspace_id,
    upper(split_part(w.domain, '.', 1)) || '-WEB',
    w.customer_id,
    w.id,
    'Website ' || w.domain,
    'HD-2026-' || lpad((20 + s.n)::text, 3, '0'),
    'Đã ký',
    s.total,
    s.collected,
    s.total - s.collected,
    current_date - s.started_days_ago,
    current_date - s.started_days_ago + 60,
    s.project_state,
    s.note,
    'dev-sample',
    'projects',
    s.n,
    encode(sha256(convert_to('dev-sample:project:' || w.domain, 'UTF8')), 'hex')
from (values
    (1, 'nhakhoaanhduong.vn', 16500000, 8250000, 75, 'Đang thi công', 'Đợt 1 đã thu, chờ nghiệm thu giao diện để thu đợt 2.'),
    (2, 'nhiantam.vn', 33000000, 16500000, 90, 'Đang thi công', 'Khách yêu cầu thêm trang bảng giá nên kéo dài thêm hai tuần.'),
    (3, 'goviet.com.vn', 27500000, 0, 110, 'Chờ nghiệm thu', 'Khách chưa nghiệm thu, hẹn gặp trong tuần.'),
    (4, 'caphenangsom.vn', 11000000, 5500000, 130, 'Tạm dừng', 'Chủ quán đi vắng, chưa phản hồi nội dung thực đơn.'),
    (5, 'spalatra.vn', 22000000, 11000000, 40, 'Đang thi công', null),
    (6, 'metreti.vn', 19800000, 9900000, 25, 'Đang thi công', null)
) as s (n, domain, total, collected, started_days_ago, project_state, note)
join public.crm_websites w on w.workspace_id = current_setting('dev_sample.workspace')::uuid and w.domain = s.domain
on conflict do nothing;

-- The real receivables: what each project still has to collect, four overdue and two not yet due.
insert into public.crm_receivables
    (workspace_id, project_code, project_id, customer_id, contract_ref, total_vnd, collected_vnd, remaining_vnd, due_on, invoiced_note,
     project_state, sales_owner, source_file, source_sheet, source_row, source_hash)
select
    p.workspace_id, p.code, p.id, p.customer_id, p.contract_no, p.value_vnd, p.collected_vnd, p.remaining_vnd,
    current_date + s.due_days, s.invoiced_note, p.status_text, 'Bảo Ngọc', 'dev-sample', 'receivables', s.n,
    encode(sha256(convert_to('dev-sample:receivable:' || p.code, 'UTF8')), 'hex')
from (values
    (1, 'NHAKHOAANHDUONG-WEB', -3, 'Đã xuất hóa đơn đợt 1'),
    (2, 'NHIANTAM-WEB', -12, 'Đã xuất hóa đơn đợt 1'),
    (3, 'GOVIET-WEB', -26, 'Chưa xuất hóa đơn, chờ nghiệm thu'),
    (4, 'CAPHENANGSOM-WEB', -45, 'Đã xuất hóa đơn đợt 1'),
    (5, 'SPALATRA-WEB', 9, 'Đã xuất hóa đơn đợt 1'),
    (6, 'METRETI-WEB', 21, 'Đã xuất hóa đơn đợt 1')
) as s (n, project_code, due_days, invoiced_note)
join public.crm_projects p on p.workspace_id = current_setting('dev_sample.workspace')::uuid and p.code = s.project_code
on conflict do nothing;

-- A notice sent about an overdue receivable (the channel and the message reference, never the words), and the payments recorded
-- against some: the bank reference that arrived. The imported amounts stay what the books say.
insert into public.crm_receivable_notices (workspace_id, receivable_id, channel, message_ref, sent_at, request_key, request_hash)
select
    r.workspace_id, r.id, s.channel, 'dev-sample-msg-' || lower(s.project_code) || '-' || s.k, now() - s.days_ago * interval '1 day',
    'dev-sample:notice:' || s.project_code || ':' || s.k,
    encode(sha256(convert_to('dev-sample:notice:' || s.project_code || ':' || s.k, 'UTF8')), 'hex')
from (values
    ('NHAKHOAANHDUONG-WEB', 1, 'zalo', 1),
    ('NHIANTAM-WEB', 1, 'phone', 8),
    ('GOVIET-WEB', 1, 'zalo', 20),
    ('GOVIET-WEB', 2, 'email', 6),
    ('CAPHENANGSOM-WEB', 1, 'zalo', 38),
    ('CAPHENANGSOM-WEB', 2, 'phone', 15)
) as s (project_code, k, channel, days_ago)
join public.crm_receivables r on r.workspace_id = current_setting('dev_sample.workspace')::uuid and r.project_code = s.project_code
on conflict do nothing;

insert into public.crm_receivable_payments (workspace_id, receivable_id, transaction_ref, recorded_at)
select
    r.workspace_id, r.id,
    'FT' || to_char(now() - s.days_ago * interval '1 day', 'YYMMDD') || upper(substr(md5('dev-sample:receivable-pay:' || s.project_code), 1, 6)),
    now() - s.days_ago * interval '1 day'
from (values
    ('NHIANTAM-WEB', 9),
    ('SPALATRA-WEB', 4),
    ('METRETI-WEB', 2)
) as s (project_code, days_ago)
join public.crm_receivables r on r.workspace_id = current_setting('dev_sample.workspace')::uuid and r.project_code = s.project_code
on conflict do nothing;

-- Supplier balances (account 331: what the agency owes its registrars and its data centre) and a note on one supplier invoice.
insert into public.crm_ledger_balances
    (workspace_id, account, party_code, party_name, opening_debit_vnd, opening_credit_vnd, debit_vnd, credit_vnd, closing_debit_vnd,
     closing_credit_vnd, source_file, source_sheet, source_row, source_hash)
select
    current_setting('dev_sample.workspace')::uuid, '331', s.party_code, s.party_name, 0, s.opening, s.paid, s.billed, 0, s.opening - s.paid + s.billed,
    'dev-sample', 'ledger', s.n, encode(sha256(convert_to('dev-sample:ledger:331:' || s.party_code, 'UTF8')), 'hex')
from (values
    (1, 'INET', 'Công ty iNET (đại lý tên miền)', 4200000, 4200000, 6930000),
    (2, 'TINO', 'Công ty Tino (đại lý tên miền, hosting)', 1850000, 1850000, 3300000),
    (3, 'VIETTELIDC', 'Viettel IDC (máy chủ)', 0, 0, 12100000)
) as s (n, party_code, party_name, opening, paid, billed)
on conflict do nothing;

insert into public.crm_payable_notes (workspace_id, party_code, invoice_no, issued_on, einvoice_ref, note, recorded_at, request_key, request_hash)
select
    current_setting('dev_sample.workspace')::uuid, s.party_code, s.invoice_no, current_date - s.days_ago, s.einvoice_ref, s.note, now() - s.days_ago * interval '1 day',
    'dev-sample:payable:' || s.party_code || ':' || s.invoice_no,
    encode(sha256(convert_to('dev-sample:payable:' || s.party_code || ':' || s.invoice_no, 'UTF8')), 'hex')
from (values
    ('INET', '0004417', 6, 'INET-EI-2611-0417', 'Hóa đơn gia hạn 14 tên miền tháng 11, đã khớp với bảng công nợ.'),
    ('VIETTELIDC', '0000932', 3, 'VTIDC-EI-2611-0932', 'Phí chỗ đặt máy chủ quý 4, chờ kế toán duyệt thanh toán.')
) as s (party_code, invoice_no, days_ago, einvoice_ref, note)
on conflict do nothing;

-- Invoice drafts. A paid renewal or a paid deal gets one draft, from the amounts already on it. The draft of a request still waiting
-- for a person or for the renewal stays a draft (the accountant has not approved the issue); the draft of a request that is
-- renewed or delivered is issued, with the number and the reference the e-invoice provider gave and the day it was issued.
insert into public.crm_invoice_drafts
    (workspace_id, renewal_id, customer_id, lines, net_vnd, vat_rate_percent, vat_vnd, total_vnd, state, price_source, invoice_no, provider_ref, issued_on)
select
    r.workspace_id,
    r.id,
    sv.customer_id,
    jsonb_build_array(jsonb_build_object(
        'description', 'Gia hạn ' || case sv.service_class when 'domain' then 'tên miền' when 'hosting' then 'hosting' else 'chứng chỉ SSL' end
            || ' ' || sv.code || ' ' || r.term_months || ' tháng',
        'quantity', 1, 'unitPriceVnd', r.net_vnd, 'amountVnd', r.net_vnd)),
    r.net_vnd, 10, r.vat_vnd, r.total_vnd,
    case when r.state = 'renewed' then 'issued' else 'draft' end,
    r.price_source,
    case when r.state = 'renewed' then '0000' || lpad((1290 + s.n)::text, 4, '0') end,
    case when r.state = 'renewed' then 'MISA-' || upper(substr(md5('dev-sample:invoice:' || sv.code), 1, 12)) end,
    case when r.state = 'renewed' then r.paid_at::date end
from (values
    (1, 'BLUEBELL-TM'), (2, 'BLUEBELL-HOST'), (3, 'SPALATRA-TM'), (4, 'HOASENVANG-TM'),
    (5, 'SALONHAVY-TM'), (6, 'GYMSUCSONG-TM'), (7, 'GIATUISACHXINH-HOST')
) as s (n, code)
join public.crm_services sv on sv.workspace_id = current_setting('dev_sample.workspace')::uuid and sv.code = s.code
join public.crm_renewal_requests r on r.workspace_id = sv.workspace_id and r.service_id = sv.id
on conflict do nothing;

insert into public.crm_invoice_drafts
    (workspace_id, purchase_id, customer_id, lines, net_vnd, vat_rate_percent, vat_vnd, total_vnd, state, price_source, invoice_no, provider_ref, issued_on)
select
    p.workspace_id,
    p.id,
    p.customer_id,
    (select jsonb_agg(jsonb_build_object(
        'description', line ->> 'name', 'quantity', (line ->> 'quantity')::integer,
        'unitPriceVnd', (line ->> 'unitPriceVnd')::bigint, 'amountVnd', (line ->> 'amountVnd')::bigint))
       from jsonb_array_elements(p.lines) as line),
    p.net_vnd, p.vat_rate_percent, p.vat_vnd, p.total_vnd,
    case when p.state = 'delivered' then 'issued' else 'draft' end,
    p.price_source,
    case when p.state = 'delivered' then '00001298' end,
    case when p.state = 'delivered' then 'MISA-' || upper(substr(md5('dev-sample:invoice:' || p.code), 1, 12)) end,
    case when p.state = 'delivered' then p.paid_at::date end
from public.crm_purchases p
where p.workspace_id = current_setting('dev_sample.workspace')::uuid
  and p.state in ('paid', 'pending_person', 'delivered')
  and p.customer_id is not null
  and p.code in ('MUA-X3C7Q8MG', 'MUA-Y6D2H5JK', 'MUA-Z4G9N3PL')
on conflict do nothing;

-- The VAT invoices of the books (the list a customer's invoice view reads): this year's issued ones, those just issued above included.
insert into public.crm_invoices
    (workspace_id, invoice_no, customer_id, issued_on, amount_vnd, source_file, source_sheet, source_row, source_hash)
select
    d.workspace_id, d.invoice_no, d.customer_id, d.issued_on, d.total_vnd, 'dev-sample', 'invoices', (row_number() over (order by d.invoice_no))::integer,
    encode(sha256(convert_to('dev-sample:invoice:' || d.invoice_no, 'UTF8')), 'hex')
from public.crm_invoice_drafts d
where d.workspace_id = current_setting('dev_sample.workspace')::uuid and d.state = 'issued' and d.invoice_no ~ '^[0-9]{8}$'
on conflict do nothing;

insert into public.crm_invoices
    (workspace_id, invoice_no, customer_id, issued_on, amount_vnd, source_file, source_sheet, source_row, source_hash)
select
    c.workspace_id, s.invoice_no, c.id, current_date - s.days_ago, s.amount, 'dev-sample', 'invoices', s.n + 100,
    encode(sha256(convert_to('dev-sample:invoice:' || s.invoice_no, 'UTF8')), 'hex')
from (values
    (1, '00001262', 'KH-0412', 160, 7260000),
    (2, '00001268', 'KH-0175', 120, 2970000),
    (3, '00001275', 'KH-0159', 95, 1980000),
    (4, '00001281', 'KH-0433', 70, 8250000),
    (5, '00001283', 'KH-0207', 52, 3960000),
    (6, '00001286', 'KH-0388', 33, 9075000)
) as s (n, invoice_no, customer_code, days_ago, amount)
join public.crm_customers c on c.workspace_id = current_setting('dev_sample.workspace')::uuid and c.code = s.customer_code
on conflict do nothing;

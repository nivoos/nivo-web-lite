-- NIVO Web dev sample, 4 of 7: renewal requests over the services of file 2, in every state the CRM keeps: awaiting payment, paid and
-- waiting for the renewal agent, waiting for a person (renew by hand at the registrar), renewed, failed, cancelled. Amounts come from
-- the CRM's placeholder price table (domain 450.000, hosting 1.200.000, SSL 600.000 VND a year before 10% VAT), so every row says
-- price_source placeholder. The pay code is GH and eight characters; a paid row holds the bank reference that matched it. Hours are
-- how long ago the thing happened.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_renewal_requests
    (workspace_id, service_id, provider, term_months, state, request_key, request_hash, confirmed_by, confirmed_at, net_vnd, vat_vnd,
     total_vnd, price_source, payment_code, transaction_ref, paid_at, provider_ref, new_expires_on, outcome_note, created_at, updated_at)
select
    sv.workspace_id,
    sv.id,
    sv.provider,
    s.term,
    s.state,
    'dev-sample:renewal:' || s.code,
    encode(sha256(convert_to('dev-sample:renewal:' || s.code, 'UTF8')), 'hex'),
    case when s.state = 'renewed' then 'Quang Huy' end,
    case when s.state = 'renewed' then now() - s.renewed_ago * interval '1 hour' end,
    price.net,
    round(price.net * 0.1)::bigint,
    price.net + round(price.net * 0.1)::bigint,
    'placeholder',
    'GH' || upper(substr(md5('dev-sample:renewal:' || s.code), 1, 8)),
    case when s.paid_ago is not null then 'FT' || to_char(now() - s.paid_ago * interval '1 hour', 'YYMMDD') || upper(substr(md5('dev-sample:pay:' || s.code), 1, 6)) end,
    case when s.paid_ago is not null then now() - s.paid_ago * interval '1 hour' end,
    case when s.state = 'renewed' then upper(sv.provider) || '-' || upper(substr(md5('dev-sample:ref:' || s.code), 1, 10)) end,
    case when s.state = 'renewed' then sv.expires_on end,
    case s.state
        when 'failed' then 'Nhà đăng ký từ chối: tên miền đã quá hạn gia hạn thường, cần khôi phục (redemption) trước.'
        when 'cancelled' then 'Khách báo tạm chưa gia hạn, sẽ liên hệ lại.'
    end,
    now() - s.created_ago * interval '1 hour',
    now() - coalesce(s.renewed_ago, s.paid_ago, s.created_ago) * interval '1 hour'
from (values
    ('NHAKHOAANHDUONG-TM', 12, 'awaiting_payment', 50, null::integer, null::integer),
    ('NHAKHOAANHDUONG-HOST', 12, 'awaiting_payment', 50, null, null),
    ('MINHLONGGOM-HOST', 12, 'awaiting_payment', 3, null, null),
    ('BLUEBELL-TM', 12, 'pending_person', 40, 22, null),
    ('BLUEBELL-HOST', 24, 'pending_person', 40, 22, null),
    ('SPALATRA-TM', 12, 'pending_person', 60, 20, null),
    ('HOASENVANG-TM', 12, 'paid', 30, 1, null),
    ('BANHMAY-TM', 12, 'failed', 120, 100, null),
    ('CAPHENANGSOM-TM', 12, 'cancelled', 200, null, null),
    ('SALONHAVY-TM', 12, 'renewed', 300, 280, 276),
    ('GYMSUCSONG-TM', 12, 'renewed', 200, 190, 100),
    ('GIATUISACHXINH-HOST', 12, 'renewed', 100, 90, 40)
) as s (code, term, state, created_ago, paid_ago, renewed_ago)
join public.crm_services sv on sv.workspace_id = current_setting('dev_sample.workspace')::uuid and sv.code = s.code
cross join lateral (
    select round((case sv.service_class when 'domain' then 450000 when 'hosting' then 1200000 else 600000 end) * s.term / 12.0)::bigint as net
) as price
on conflict do nothing;

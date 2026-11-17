-- NIVO Web dev sample, 5 of 7: deals (the CRM's purchases) from the first enquiry to delivered, lost and cancelled, with their
-- follow-ups. A quote is built from the CRM's placeholder price table by price code (that table lives in the CRM code, not in a
-- database table): each line is one price row of it, the amounts are the table's, VAT is 10%, and price_source says placeholder.
-- A code is MUA- and eight characters; the pay code is MH and the same eight; a deal that is paid holds the bank reference that
-- matched it. Days are how long ago the thing happened.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

with
price (code, name, term, unit) as (values
    ('new-website', 'Website build', null::integer, 6000000),
    ('new-domain-12', 'New domain, 12 months', 12, 450000),
    ('new-hosting-12', 'New hosting, 12 months', 12, 1200000),
    ('new-hosting-24', 'New hosting, 24 months', 24, 2400000),
    ('new-ssl-12', 'New ssl, 12 months', 12, 600000)
),
deal (n, suffix, state, channel, source_ref, need, contact_name, domain, customer_code, items, quoted_days_ago, valid_days, created_days_ago, paid_days_ago) as (values
    (1, 'P3H9K2WA', 'enquiry', 'zalo', 'zalo:conv-tiembanhmay', 'Muốn làm website bán bánh sinh nhật, có giỏ hàng và thanh toán chuyển khoản.', 'Lương Thị Mây', 'banhmay.vn', 'KH-0466', null::text[], null::integer, null::integer, 1, null::integer),
    (2, 'Q8D4N7ZC', 'enquiry', 'phone', 'phone:garage-long-phat', 'Hỏi giá làm lại website, tên miền cũ đã hết hạn.', 'Chủ garage', 'garagelongphat.vn', 'KH-0480', null, null, null, 2, null),
    (3, 'R2M6T5VE', 'enquiry', 'web', 'web:form-gym-moi', 'Cần website giới thiệu phòng tập, khoảng 5 trang, có đăng ký thử buổi tập.', 'Chị Thu Hằng', null, null, null, null, null, 0, null),
    (4, 'T7F3X9HB', 'quoted', 'zalo', 'zalo:conv-nhakhoaanhduong', 'Làm website giới thiệu phòng khám, đặt lịch hẹn trực tuyến.', 'Nguyễn Thu Hà', 'nhakhoaanhduong.vn', 'KH-0388', array['new-website', 'new-hosting-12', 'new-ssl-12'], 5, 14, 6, null),
    (5, 'V5K8P2YD', 'quoted', 'zalo', 'zalo:conv-spalatra', 'Thêm gói hosting 24 tháng và SSL cho website spa.', 'Lê Thị Trà', 'spalatra.vn', 'KH-0420', array['new-hosting-24', 'new-ssl-12'], 12, 14, 12, null),
    (6, 'W9B4L6RF', 'awaiting_payment', 'email', 'email:thread-goviet', 'Thêm hosting và tên miền .com cho cửa hàng nội thất.', 'Trịnh Văn Hưng', 'goviet.com.vn', 'KH-0451', array['new-hosting-12', 'new-domain-12'], 4, 14, 5, null),
    (7, 'X3C7Q8MG', 'paid', 'zalo', 'zalo:conv-nhiantam', 'Làm website phòng khám nhi, trang đặt lịch và bảng giá dịch vụ.', 'Đặng Thanh Tâm', 'nhiantam.vn', 'KH-0472', array['new-website', 'new-hosting-12', 'new-domain-12'], 9, 14, 10, 0),
    (8, 'Y6D2H5JK', 'pending_person', 'zalo', 'zalo:conv-caphenangsom', 'Làm website quán cà phê có thực đơn và bản đồ.', 'Nguyễn Hoàng Nam', 'caphenangsom.vn', 'KH-0302', array['new-website', 'new-hosting-12'], 14, 14, 15, 2),
    (9, 'Z4G9N3PL', 'delivered', 'email', 'email:thread-tiemhoalucbinh', 'Làm website tiệm hoa, giỏ hoa theo dịp lễ.', 'Phạm Thị Bình', 'tiemhoalucbinh.vn', 'KH-0344', array['new-website', 'new-hosting-12', 'new-domain-12', 'new-ssl-12'], 30, 14, 32, 20),
    (10, 'A8H5R2SM', 'lost', 'zalo', 'zalo:conv-gymsucsong', 'Báo giá website phòng tập 8 trang kèm đặt lịch lớp.', 'Bùi Anh Tuấn', 'gymsucsong.vn', 'KH-0437', array['new-website', 'new-hosting-12'], 25, 14, 26, null),
    (11, 'B5J7T4NQ', 'cancelled', 'phone', 'phone:me-va-be', 'Làm website cửa hàng mẹ và bé, bán hàng trực tuyến.', 'Đinh Mỹ Linh', 'metreti.vn', 'KH-0445', array['new-website', 'new-hosting-12', 'new-ssl-12'], 40, 14, 42, null)
),
quote as (
    select
        d.*,
        (select jsonb_agg(jsonb_build_object('priceCode', p.code, 'name', p.name, 'termMonths', p.term, 'quantity', 1, 'unitPriceVnd', p.unit, 'amountVnd', p.unit) order by p.code)
           from unnest(d.items) as i (code) join price p on p.code = i.code) as lines,
        (select sum(p.unit) from unnest(d.items) as i (code) join price p on p.code = i.code)::bigint as net
    from deal d
)
insert into public.crm_purchases
    (workspace_id, code, state, channel, source_ref, need, contact_name, phone, email, domain, customer_code, customer_id, lines, net_vnd,
     vat_rate_percent, vat_vnd, total_vnd, price_source, quoted_on, valid_until, payment_code, transaction_ref, paid_at, accepted_at,
     project_code, contract_no, note, confirmed_by, confirmed_at, created_at, updated_at)
select
    current_setting('dev_sample.workspace')::uuid,
    'MUA-' || q.suffix,
    q.state,
    q.channel,
    q.source_ref,
    q.need,
    q.contact_name,
    case when q.customer_code is null then '0901' || lpad(q.n::text, 6, '0') end,
    null,
    q.domain,
    q.customer_code,
    c.id,
    q.lines,
    q.net,
    case when q.lines is not null then 10 end,
    case when q.lines is not null then round(q.net * 0.1)::bigint end,
    case when q.lines is not null then q.net + round(q.net * 0.1)::bigint end,
    case when q.lines is not null then 'placeholder' end,
    case when q.lines is not null then current_date - q.quoted_days_ago end,
    case when q.lines is not null then current_date - q.quoted_days_ago + q.valid_days end,
    case when q.state in ('awaiting_payment', 'paid', 'pending_person', 'delivered') then 'MH' || q.suffix end,
    case when q.paid_days_ago is not null then 'FT' || to_char(now() - q.paid_days_ago * interval '1 day', 'YYMMDD') || upper(substr(md5('dev-sample:pay:' || q.suffix), 1, 6)) end,
    case when q.paid_days_ago is not null then now() - q.paid_days_ago * interval '1 day' end,
    case when q.state in ('awaiting_payment', 'paid', 'pending_person', 'delivered') then now() - (q.quoted_days_ago - 1) * interval '1 day' end,
    case when q.state = 'delivered' then upper(split_part(q.domain, '.', 1)) || '-WEB' end,
    case when q.state = 'delivered' then 'HD-2026-' || lpad((100 + q.n)::text, 3, '0') end,
    case q.state
        when 'lost' then 'Khách chọn đơn vị khác rẻ hơn.'
        when 'cancelled' then 'Khách hoãn dự án sang quý sau.'
    end,
    case when q.state = 'delivered' then 'Minh Khoa' end,
    case when q.state = 'delivered' then now() - (q.paid_days_ago - 6) * interval '1 day' end,
    now() - q.created_days_ago * interval '1 day',
    now() - coalesce(q.paid_days_ago, q.quoted_days_ago, q.created_days_ago) * interval '1 day'
from quote q
left join public.crm_customers c on c.workspace_id = current_setting('dev_sample.workspace')::uuid and c.code = q.customer_code
on conflict do nothing;

-- The follow-ups of the deals that were quoted, one a day at most: sent, answered, no answer or declined.
insert into public.crm_purchase_followups (workspace_id, purchase_id, day, channel, outcome, message_ref, source_hash)
select
    p.workspace_id,
    p.id,
    current_date - f.days_ago,
    f.channel,
    f.outcome,
    'dev-sample-msg-' || lower(f.suffix) || '-' || f.days_ago,
    encode(sha256(convert_to('dev-sample:followup:' || f.suffix || ':' || f.days_ago, 'UTF8')), 'hex')
from (values
    ('T7F3X9HB', 3, 'zalo', 'sent'),
    ('T7F3X9HB', 1, 'zalo', 'no_answer'),
    ('V5K8P2YD', 10, 'zalo', 'sent'),
    ('V5K8P2YD', 6, 'zalo', 'answered'),
    ('V5K8P2YD', 2, 'zalo', 'no_answer'),
    ('W9B4L6RF', 3, 'email', 'sent'),
    ('W9B4L6RF', 1, 'email', 'answered'),
    ('A8H5R2SM', 20, 'zalo', 'sent'),
    ('A8H5R2SM', 14, 'zalo', 'no_answer'),
    ('A8H5R2SM', 9, 'phone', 'declined')
) as f (suffix, days_ago, channel, outcome)
join public.crm_purchases p on p.workspace_id = current_setting('dev_sample.workspace')::uuid and p.code = 'MUA-' || f.suffix
on conflict do nothing;

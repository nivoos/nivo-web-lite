-- NIVO Web dev sample, 2 of 7: domains, hosting and SSL, 40 services over the 18 websites. End dates are offsets from TODAY, so
-- about 30% (12) end within 30 days and 4 are already past; this file runs on every dev up and moves the dates of its own rows
-- (source_file dev-sample) back to the same offsets, so the sample never goes stale. The status is the one the end date implies.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_services
    (workspace_id, code, customer_id, website_id, service_class, provider, status, status_text, starts_on, expires_on, expiry_source,
     note, source_file, source_sheet, source_row, source_hash)
select
    w.workspace_id,
    upper(split_part(w.domain, '.', 1)) || '-' || case s.service_class when 'domain' then 'TM' when 'hosting' then 'HOST' else 'SSL' end,
    w.customer_id,
    w.id,
    s.service_class,
    s.provider,
    case when s.days is null then 'expiry_unknown' when s.days < 0 then 'expired' when s.days <= 30 then 'expiring' else 'active' end,
    case when s.days is null then 'Chưa rõ ngày hết hạn' when s.days < 0 then 'Đã hết hạn' when s.days <= 30 then 'Sắp hết hạn' else 'Đang hoạt động' end,
    case when s.days is not null then current_date + s.days - 365 end,
    case when s.days is not null then current_date + s.days end,
    case when s.days is null then 'none' else s.source end,
    case when s.days is null then 'Khách tự giữ hosting ở nơi khác, chưa xác nhận ngày hết hạn.' end,
    'dev-sample',
    'services',
    (row_number() over (order by w.domain, s.service_class))::integer,
    encode(sha256(convert_to('dev-sample:service:' || w.domain || ':' || s.service_class, 'UTF8')), 'hex')
from (values
    ('minhlonggom.vn', 'domain', 'inet', 320, 'provider'),
    ('minhlonggom.vn', 'hosting', 'inet', 14, 'provider'),
    ('minhlonggom.vn', 'ssl', 'tino', 200, 'provider'),
    ('nhakhoaanhduong.vn', 'domain', 'inet', 6, 'provider'),
    ('nhakhoaanhduong.vn', 'hosting', 'inet', 6, 'provider'),
    ('mocland.com.vn', 'domain', 'tino', 3, 'provider'),
    ('mocland.com.vn', 'hosting', 'azwebsite', 190, 'provider'),
    ('bluebell.edu.vn', 'domain', 'inet', 21, 'provider'),
    ('bluebell.edu.vn', 'hosting', 'inet', 21, 'provider'),
    ('saovietfood.vn', 'domain', 'inet', 260, 'provider'),
    ('saovietfood.vn', 'hosting', 'azwebsite', 9, 'provider'),
    ('saovietfood.vn', 'ssl', 'azwebsite', 9, 'provider'),
    ('hoasenvang.spa', 'domain', 'tino', 27, 'provider'),
    ('hoasenvang.spa', 'hosting', 'tino', 27, 'provider'),
    ('phucthinhlaw.vn', 'domain', 'inet', 145, 'provider'),
    ('phucthinhlaw.vn', 'hosting', 'inet', 145, 'provider'),
    ('phucthinhlaw.vn', 'ssl', 'inet', 50, 'provider'),
    ('goviet.com.vn', 'domain', 'inet', 60, 'estimated'),
    ('goviet.com.vn', 'hosting', 'inet', 60, 'estimated'),
    ('banhmay.vn', 'domain', 'inet', -5, 'provider'),
    ('banhmay.vn', 'hosting', 'inet', -5, 'provider'),
    ('nhiantam.vn', 'domain', 'inet', 12, 'provider'),
    ('nhiantam.vn', 'hosting', 'azwebsite', 330, 'provider'),
    ('garagelongphat.vn', 'domain', 'tino', -19, 'invoice'),
    ('garagelongphat.vn', 'hosting', 'manual', null, 'none'),
    ('caphenangsom.vn', 'domain', 'tino', 90, 'provider'),
    ('caphenangsom.vn', 'hosting', 'tino', 90, 'provider'),
    ('tiemhoalucbinh.vn', 'domain', 'tino', -2, 'provider'),
    ('tiemhoalucbinh.vn', 'hosting', 'tino', 40, 'provider'),
    ('salonhavy.vn', 'domain', 'inet', 240, 'provider'),
    ('salonhavy.vn', 'hosting', 'inet', 240, 'provider'),
    ('salonhavy.vn', 'ssl', 'inet', 240, 'provider'),
    ('spalatra.vn', 'domain', 'inet', 25, 'provider'),
    ('spalatra.vn', 'hosting', 'inet', 180, 'provider'),
    ('gymsucsong.vn', 'domain', 'tino', 110, 'provider'),
    ('gymsucsong.vn', 'hosting', 'tino', 110, 'provider'),
    ('metreti.vn', 'domain', 'inet', 45, 'provider'),
    ('metreti.vn', 'hosting', 'inet', 45, 'provider'),
    ('giatuisachxinh.vn', 'domain', 'inet', 75, 'confirmed'),
    ('giatuisachxinh.vn', 'hosting', 'inet', 75, 'confirmed')
) as s (domain, service_class, provider, days, source)
join public.crm_websites w on w.workspace_id = current_setting('dev_sample.workspace')::uuid and w.domain = s.domain
on conflict (workspace_id, code) do update set
    status = excluded.status,
    status_text = excluded.status_text,
    starts_on = excluded.starts_on,
    expires_on = excluded.expires_on,
    expiry_source = excluded.expiry_source
where public.crm_services.source_file = 'dev-sample';

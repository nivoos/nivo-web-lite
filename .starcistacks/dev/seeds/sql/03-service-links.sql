-- NIVO Web dev sample, 3 of 7: the provider accounts (dry run, as the CRM ships them), the services' links to them and the reminders
-- already sent. A service that ends within 30 days was reminded once, 30 days before its end; one that ends within 7 days, or already
-- ended, was reminded again 7 days before, on the channel its contact prefers (phone when nobody is on file).
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_provider_accounts (workspace_id, provider, label, mode)
select current_setting('dev_sample.workspace')::uuid, s.provider, s.label, 'dry_run'
from (values
    ('inet', 'iNET đại lý'),
    ('tino', 'Tino đại lý'),
    ('azwebsite', 'AZ Website'),
    ('manual', 'Làm tay')
) as s (provider, label)
on conflict (workspace_id, provider, label) do nothing;

insert into public.crm_provider_links (workspace_id, service_id, account_id, external_id)
select sv.workspace_id, sv.id, a.id, upper(sv.provider) || '-' || sv.code
from public.crm_services sv
join public.crm_provider_accounts a on a.workspace_id = sv.workspace_id and a.provider = sv.provider
where sv.workspace_id = current_setting('dev_sample.workspace')::uuid and sv.source_file = 'dev-sample' and sv.provider is not null
on conflict do nothing;

insert into public.crm_service_reminders (workspace_id, service_id, channel, message_ref, sent_at, outcome, request_key, request_hash)
select
    sv.workspace_id,
    sv.id,
    coalesce(
        (select ct.preferred_channel from public.crm_contacts ct where ct.workspace_id = sv.workspace_id and ct.customer_id = sv.customer_id limit 1),
        'phone'
    ),
    'dev-sample-msg-' || lower(sv.code) || '-' || n.n,
    ((sv.expires_on - case n.n when 1 then 30 else 7 end)::timestamp + time '08:00') at time zone 'Asia/Ho_Chi_Minh',
    case when n.n = 1 then 'sent' when length(sv.code) % 3 = 0 then 'answered' else 'no_answer' end,
    'dev-sample:reminder:' || sv.code || ':' || n.n,
    encode(sha256(convert_to('dev-sample:reminder:' || sv.code || ':' || n.n, 'UTF8')), 'hex')
from public.crm_services sv
cross join generate_series(1, 2) as n (n)
where sv.workspace_id = current_setting('dev_sample.workspace')::uuid
  and sv.source_file = 'dev-sample'
  and sv.expires_on is not null
  and sv.expires_on <= current_date + 30
  and (n.n = 1 or sv.expires_on <= current_date + 7)
on conflict do nothing;

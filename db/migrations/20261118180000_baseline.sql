-- starci:baseline-reset owner-2026-11-18-clean-db
-- The one baseline of nivo-web-lite: the identity tables, the CRM tables and their functions, rewritten from the earlier migration chain with
-- foreign key columns named after the table they reference and an index leading each foreign key. The app keeps no data worth migrating.

-- ---- from 20261111184812_baseline.sql
do $$
begin
    if not exists (select 1 from pg_catalog.pg_roles where rolname = 'app_be') then
        create role app_be login noinherit nosuperuser nobypassrls nocreatedb nocreaterole;
    end if;
end;
$$;

-- The attributes a migration may change: SUPERUSER and BYPASSRLS stay as create role set them.
alter role app_be login noinherit nocreatedb nocreaterole;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- The device sessions and rotating refresh tokens of @starci/auth. A token is stored by its sha256 only; a rotated token stays,
-- marked used, so a replay is detected: a replay inside the grace window gets a successor of its own (raced_count bounds how many),
-- an older one ends the session and every token of it.
-- identity_attempts counts the sign-in attempts of one address in a window every replica shares (the budget of failures).
-- The app owns auth.users (db/bootstrap.sql) and the role app_be.

create table public.identity_sessions (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    refreshed_at timestamptz not null default now(),
    user_agent text,
    ip text
);

create index identity_sessions_user_idx on public.identity_sessions (user_id);

create table public.identity_refresh_tokens (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.identity_sessions (id) on delete cascade,
    user_id uuid not null,
    token_hash text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    used_at timestamptz,
    raced_count integer not null default 0,
    constraint identity_refresh_tokens_hash_key unique (token_hash)
);

create index identity_refresh_tokens_session_idx on public.identity_refresh_tokens (session_id);
create index identity_refresh_tokens_expiry_idx on public.identity_refresh_tokens (user_id, expires_at);

create table public.identity_attempts (
    key varchar(128) primary key,
    hits integer not null,
    reset_at timestamptz not null
);

create index identity_attempts_reset_idx on public.identity_attempts (reset_at);

alter table public.identity_sessions enable row level security;
alter table public.identity_sessions force row level security;
alter table public.identity_refresh_tokens enable row level security;
alter table public.identity_refresh_tokens force row level security;
alter table public.identity_attempts enable row level security;
alter table public.identity_attempts force row level security;

revoke all on table public.identity_sessions from public;
revoke all on table public.identity_refresh_tokens from public;
revoke all on table public.identity_attempts from public;
grant select, insert, update, delete on table public.identity_sessions to app_be;
grant select, insert, update, delete on table public.identity_refresh_tokens to app_be;
grant select, insert, update, delete on table public.identity_attempts to app_be;

create policy identity_sessions_app_be_all on public.identity_sessions
    for all to app_be using (current_user = 'app_be') with check (current_user = 'app_be');
create policy identity_refresh_tokens_app_be_all on public.identity_refresh_tokens
    for all to app_be using (current_user = 'app_be') with check (current_user = 'app_be');
create policy identity_attempts_app_be_all on public.identity_attempts
    for all to app_be using (current_user = 'app_be') with check (current_user = 'app_be');

-- The account doors of a lite app: the only way app_be reaches auth.users and auth.identities (it holds no grant on schema auth). Eight
-- SECURITY DEFINER functions with a pinned search_path, EXECUTE revoked from public and the browser roles and granted to app_be alone: an
-- account comes back only for an exact address or id, a hash only for an exact address, and no door writes role or app metadata; the hash
-- is written only by a new account and by be_auth_set_password.
-- The text is the canon owner of the doors (templates/app/auth-doors.sql.partial); the back end calls them through persistence/account-doors.port.ts.

-- Looks up an address in lower case; the bootstrap index serves email as written, not lower(email).
create index if not exists users_email_lower_idx on auth.users (lower(email)) where is_anonymous = false;

-- A person by sign-in address (lower-cased), with the stored bcrypt hash so the back end can verify it.
CREATE FUNCTION public.be_auth_user_by_email(p_email text)
    RETURNS TABLE(id uuid, email text, encrypted_password text, email_confirmed_at timestamp with time zone, disabled boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select u.id, u.email::text, u.encrypted_password::text, u.email_confirmed_at,
         (u.deleted_at is not null or (u.banned_until is not null and u.banned_until > now()))
    from auth.users u
   where lower(u.email) = p_email and u.is_anonymous = false
   order by u.created_at asc nulls last
   limit 1;
$$;

-- One person by id.
CREATE FUNCTION public.be_auth_user_by_id(p_user uuid)
    RETURNS TABLE(id uuid, email text, last_sign_in_at timestamp with time zone, meta jsonb, disabled boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select u.id, u.email::text, u.last_sign_in_at, coalesce(u.raw_user_meta_data, '{}'::jsonb),
         (u.deleted_at is not null or (u.banned_until is not null and u.banned_until > now()))
    from auth.users u where u.id = p_user;
$$;

-- The person a Google account is linked to, if any.
CREATE FUNCTION public.be_auth_user_by_google(p_provider_id text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select i.user_id from auth.identities i where i.provider = 'google' and i.provider_id = p_provider_id limit 1;
$$;

-- Creates a person; a null hash is an invited or Google-only account that has no password yet.
CREATE FUNCTION public.be_auth_create_user(p_id uuid, p_email text, p_hash text, p_confirmed boolean, p_meta jsonb, p_now timestamp with time zone)
    RETURNS uuid
    LANGUAGE sql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, p_hash,
          case when p_confirmed then p_now end, case when p_hash is null and not p_confirmed then p_now end,
          '{"provider":"email","providers":["email"]}'::jsonb, p_meta, p_now, p_now)
  returning id;
$$;

-- Links a Google account to a person.
CREATE FUNCTION public.be_auth_link_google(p_user uuid, p_provider_id text, p_data jsonb, p_now timestamp with time zone) RETURNS void
    LANGUAGE sql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_provider_id, p_user, p_data, 'google', p_now, p_now, p_now)
  on conflict (provider_id, provider) do update set last_sign_in_at = p_now, updated_at = p_now;
$$;

-- Records a sign-in; a verified Google address also confirms the mailbox; profile keys only fill what the person has not set.
CREATE FUNCTION public.be_auth_touch_user(p_user uuid, p_now timestamp with time zone, p_confirm boolean, p_meta jsonb) RETURNS void
    LANGUAGE sql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  update auth.users
     set last_sign_in_at = p_now,
         updated_at = p_now,
         email_confirmed_at = case when p_confirm then coalesce(email_confirmed_at, p_now) else email_confirmed_at end,
         raw_user_meta_data = p_meta || coalesce(raw_user_meta_data, '{}'::jsonb)
   where id = p_user;
$$;

-- Stamps the confirmation of a mailbox (a spent confirmation link); a mailbox that is already confirmed keeps its date and the sign-in record is untouched.
CREATE FUNCTION public.be_auth_confirm_user(p_user uuid, p_now timestamp with time zone) RETURNS void
    LANGUAGE sql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, p_now), updated_at = p_now where id = p_user;
$$;

-- Sets a new password hash; when p_confirm is true (a spent reset link proved the mailbox) the address is confirmed too.
CREATE FUNCTION public.be_auth_set_password(p_user uuid, p_hash text, p_confirm boolean, p_now timestamp with time zone) RETURNS void
    LANGUAGE sql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  update auth.users
     set encrypted_password = p_hash,
         email_confirmed_at = case when p_confirm then coalesce(email_confirmed_at, p_now) else email_confirmed_at end,
         updated_at = p_now
   where id = p_user;
$$;

REVOKE EXECUTE ON FUNCTION public.be_auth_user_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_user_by_email(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_user_by_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_user_by_id(uuid) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_user_by_google(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_user_by_google(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_create_user(uuid, text, text, boolean, jsonb, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_create_user(uuid, text, text, boolean, jsonb, timestamp with time zone) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_link_google(uuid, text, jsonb, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_link_google(uuid, text, jsonb, timestamp with time zone) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_touch_user(uuid, timestamp with time zone, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_touch_user(uuid, timestamp with time zone, boolean, jsonb) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_confirm_user(uuid, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_confirm_user(uuid, timestamp with time zone) TO app_be;
REVOKE EXECUTE ON FUNCTION public.be_auth_set_password(uuid, text, boolean, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_auth_set_password(uuid, text, boolean, timestamp with time zone) TO app_be;

-- The single-use links that confirm a mailbox or reset a password (the email doors of sign-in): only the sha256 of the token is
-- stored, a spent link stays marked used, and a new link of the same purpose ends the older ones.
create table public.identity_email_tokens (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    purpose varchar(16) not null check (purpose in ('confirm', 'reset')),
    token_hash varchar(64) not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null,
    constraint identity_email_tokens_hash_key unique (token_hash)
);

create index identity_email_tokens_user_idx on public.identity_email_tokens (user_id, purpose);

alter table public.identity_email_tokens enable row level security;
alter table public.identity_email_tokens force row level security;
revoke all on table public.identity_email_tokens from public;
grant select, insert, update, delete on table public.identity_email_tokens to app_be;
create policy identity_email_tokens_app_be_all on public.identity_email_tokens
    for all to app_be using (current_user = 'app_be') with check (current_user = 'app_be');

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null check (char_length(display_name) between 1 and 120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

create policy profiles_app_be_select
on public.profiles
for select
to app_be
using (current_user = 'app_be');

create policy profiles_app_be_insert
on public.profiles
for insert
to app_be
with check (current_user = 'app_be');

create policy profiles_app_be_update
on public.profiles
for update
to app_be
using (current_user = 'app_be')
with check (current_user = 'app_be');

grant usage on schema public to app_be;
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert on table public.profiles to app_be;
grant update (display_name) on table public.profiles to app_be;

-- The rate limit windows of platform/http-security: every api replica counts a caller's hits in the same row, and a hit
-- that opens a fresh window prunes a bounded batch of the ended ones.
create table public.http_security_rate_windows (
    key varchar(128) primary key,
    hits integer not null check (hits > 0),
    reset_at timestamptz not null
);

create index http_security_rate_windows_reset_at_idx on public.http_security_rate_windows (reset_at);

alter table public.http_security_rate_windows enable row level security;
alter table public.http_security_rate_windows force row level security;

create policy http_security_rate_windows_app_be_select
on public.http_security_rate_windows
for select
to app_be
using (current_user = 'app_be');

create policy http_security_rate_windows_app_be_insert
on public.http_security_rate_windows
for insert
to app_be
with check (current_user = 'app_be');

create policy http_security_rate_windows_app_be_update
on public.http_security_rate_windows
for update
to app_be
using (current_user = 'app_be')
with check (current_user = 'app_be');

create policy http_security_rate_windows_app_be_delete
on public.http_security_rate_windows
for delete
to app_be
using (current_user = 'app_be');

revoke all on table public.http_security_rate_windows from public, anon, authenticated;
grant select, insert, update, delete on table public.http_security_rate_windows to app_be;

-- ---- from 20261111190830_crm-customers-services.sql
-- nivo-web-lite CRM (customers, websites, services, provider port, renewal requests): converted from the holding project's 0001..0005 (never applied anywhere), 2026-11-12.
-- Tables live in schema public with the crm_ prefix; updated_at is set by private.set_updated_at() of the baseline.

-- One customer of an enterprise, keyed by its code as the source writes it (an opaque text, never parsed: `NAME-YYMMDD`, `AZ###-CHUAXD`, ...).
-- `kind` unknown when the source leaves it empty (never guessed from the name); `placeholder` is the one `UNASSIGNED` customer that holds
-- the services whose customer code the list does not know. `reachable` is false when neither a phone nor an e-mail is known.
CREATE TABLE public.crm_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    code text NOT NULL,
    kind text NOT NULL,
    name text NOT NULL,
    tax_id text,
    address text,
    phone text,
    email text,
    folder_path text,
    reachable boolean NOT NULL,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_customers_code_key UNIQUE (workspace_id, code),
    CONSTRAINT crm_customers_code_check CHECK ((char_length(code) BETWEEN 1 AND 80)),
    CONSTRAINT crm_customers_kind_check CHECK ((kind = ANY (ARRAY['company'::text, 'person'::text, 'unknown'::text, 'placeholder'::text]))),
    CONSTRAINT crm_customers_name_check CHECK ((char_length(name) BETWEEN 1 AND 400)),
    CONSTRAINT crm_customers_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_customers_source_hash_check CHECK ((char_length(source_hash) = 64))
);

-- The customer search reads names, tax ids, phones and e-mails in one bounded scan of a small table (about 130 rows).
CREATE INDEX crm_customers_tax_id ON public.crm_customers USING btree (workspace_id, tax_id) WHERE (tax_id IS NOT NULL);

-- A contact person of a customer: none in the source today (no contact person, no Zalo id); filled by hand or a later flow.
CREATE TABLE public.crm_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    zalo_id text,
    preferred_channel text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_contacts_name_check CHECK ((char_length(name) BETWEEN 1 AND 200)),
    CONSTRAINT crm_contacts_channel_check CHECK (((preferred_channel IS NULL) OR (preferred_channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text]))))
);

CREATE INDEX crm_contacts_customer ON public.crm_contacts USING btree (workspace_id, crm_customer_id);

-- A website of a customer, keyed by its domain (lower case); one domain carries up to three services (domain, hosting, SSL) and a build.
CREATE TABLE public.crm_websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    domain text NOT NULL,
    crm_customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_websites_domain_key UNIQUE (workspace_id, domain),
    CONSTRAINT crm_websites_domain_check CHECK (((char_length(domain) BETWEEN 3 AND 253) AND (domain = lower(domain)))),
    CONSTRAINT crm_websites_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_websites_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_websites_customer ON public.crm_websites USING btree (workspace_id, crm_customer_id);

CREATE TRIGGER crm_customers_set_updated_at BEFORE UPDATE ON public.crm_customers FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_contacts_set_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_websites_set_updated_at BEFORE UPDATE ON public.crm_websites FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 0002_services-providers: forward-only; never edited once applied. Expand only: five new tables in schema crm, nothing else touched.
-- The recurring services of an enterprise (domain, hosting, SSL) and the provider port they are renewed through. A workflow never names a
-- provider: it asks the CRM to renew a service, and the CRM routes to the plugin of that service's provider (P1: `manual` only, a person
-- renews and confirms). Each provider has a mode stored here, `dry_run` unless the owner flips it; a provider without a row is dry-run.

-- One recurring service, keyed by its project code as the source writes it (`<SITE>-<HOST|TM|SSL>`). `status` is the fixed mapping of the
-- source's free text (kept raw in `status_text`); `expiry_source` says where the end date came from: the provider's panel, an estimate
-- (never renewed on an estimate without a provider check), an invoice, the enterprise's own confirmation, or nothing (`expires_on` null).
CREATE TABLE public.crm_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    code text NOT NULL,
    crm_customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    crm_website_id uuid REFERENCES public.crm_websites(id) ON DELETE SET NULL,
    service_class text NOT NULL,
    provider text,
    status text NOT NULL,
    status_text text,
    starts_on date,
    expires_on date,
    expiry_source text NOT NULL,
    expiry_basis text,
    note text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_services_code_key UNIQUE (workspace_id, code),
    CONSTRAINT crm_services_code_check CHECK ((char_length(code) BETWEEN 1 AND 120)),
    CONSTRAINT crm_services_class_check CHECK ((service_class = ANY (ARRAY['hosting'::text, 'domain'::text, 'ssl'::text]))),
    CONSTRAINT crm_services_provider_check CHECK (((provider IS NULL) OR (provider = ANY (ARRAY['tino'::text, 'inet'::text, 'azwebsite'::text, 'manual'::text])))),
    CONSTRAINT crm_services_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expiring'::text, 'expired'::text, 'suspended'::text, 'cancelled'::text, 'trial'::text, 'internal'::text, 'private_hosting'::text, 'not_found'::text, 'expiry_unknown'::text, 'unknown'::text, 'pending'::text]))),
    CONSTRAINT crm_services_expiry_source_check CHECK ((expiry_source = ANY (ARRAY['provider'::text, 'estimated'::text, 'invoice'::text, 'confirmed'::text, 'none'::text]))),
    CONSTRAINT crm_services_expiry_check CHECK (((expires_on IS NULL) = (expiry_source = 'none'::text))),
    CONSTRAINT crm_services_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_services_source_hash_check CHECK ((char_length(source_hash) = 64))
);

-- The renewal list: services by end date.
CREATE INDEX crm_services_expires ON public.crm_services USING btree (workspace_id, expires_on) WHERE (expires_on IS NOT NULL);

-- A customer's services.
CREATE INDEX crm_services_customer ON public.crm_services USING btree (workspace_id, crm_customer_id);

-- One reminder sent about a service (written by the renewal flow, P3): the channel and the message reference, never the words.
CREATE TABLE public.crm_service_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    channel text NOT NULL,
    message_ref text,
    sent_at timestamptz NOT NULL,
    outcome text DEFAULT 'sent'::text NOT NULL,
    request_key text,
    request_hash text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_service_reminders_outcome_check CHECK ((outcome = ANY (ARRAY['sent'::text, 'quoted'::text, 'answered'::text, 'declined'::text, 'no_answer'::text]))),
    CONSTRAINT crm_service_reminders_request_key_check CHECK (((request_key IS NULL) OR (char_length(request_key) BETWEEN 1 AND 200))),
    CONSTRAINT crm_service_reminders_request_hash_check CHECK (((request_hash IS NULL) OR (char_length(request_hash) = 64))),
    CONSTRAINT crm_service_reminders_channel_check CHECK ((channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text])))
);

CREATE INDEX crm_service_reminders_service ON public.crm_service_reminders USING btree (workspace_id, crm_service_id, sent_at DESC);

-- One account of an enterprise at a provider, with the provider's mode: `dry_run` answers what a renewal WOULD do and records it, `live`
-- calls the provider. Only the owner flips a provider to live; the credentials are the CRM app's sealed members, never stored here.
CREATE TABLE public.crm_provider_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    provider text NOT NULL,
    label text NOT NULL,
    mode text DEFAULT 'dry_run'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_provider_accounts_provider_label_key UNIQUE (workspace_id, provider, label),
    CONSTRAINT crm_provider_accounts_provider_check CHECK ((provider = ANY (ARRAY['tino'::text, 'inet'::text, 'azwebsite'::text, 'manual'::text]))),
    CONSTRAINT crm_provider_accounts_label_check CHECK ((char_length(label) BETWEEN 1 AND 120)),
    CONSTRAINT crm_provider_accounts_mode_check CHECK ((mode = ANY (ARRAY['dry_run'::text, 'live'::text])))
);

-- A service at a provider account, with the provider-side id when known (filled from the provider, P4).
CREATE TABLE public.crm_provider_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    crm_provider_account_id uuid NOT NULL REFERENCES public.crm_provider_accounts(id) ON DELETE CASCADE,
    external_id text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_provider_links_service_key UNIQUE (workspace_id, crm_service_id)
);

-- One renewal asked of a provider plugin. The `manual` plugin records `pending_person` (a person renews at the provider and confirms);

-- `request_key` is the caller's replay key, so a repeated call answers the same row and never asks twice.
CREATE TABLE public.crm_renewal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    provider text NOT NULL,
    term_months integer NOT NULL,
    state text NOT NULL,
    request_key text NOT NULL,
    confirmed_by text,
    confirmed_at timestamptz,
    request_hash text,
    net_vnd bigint,
    vat_vnd bigint,
    total_vnd bigint,
    price_source text DEFAULT 'placeholder'::text NOT NULL,
    payment_code text,
    transaction_ref text,
    paid_at timestamptz,
    provider_ref text,
    new_expires_on date,
    outcome_note text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_renewal_requests_request_key_key UNIQUE (workspace_id, request_key),
    CONSTRAINT crm_renewal_requests_provider_check CHECK ((provider = ANY (ARRAY['tino'::text, 'inet'::text, 'azwebsite'::text, 'manual'::text]))),
    CONSTRAINT crm_renewal_requests_term_check CHECK ((term_months BETWEEN 1 AND 120)),
    CONSTRAINT crm_renewal_requests_state_check CHECK ((state = ANY (ARRAY['awaiting_payment'::text, 'paid'::text, 'pending_person'::text, 'renewed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT crm_renewal_requests_key_check CHECK ((char_length(request_key) BETWEEN 1 AND 200)),
    CONSTRAINT crm_renewal_requests_money_check CHECK (((net_vnd IS NULL) OR ((net_vnd >= 0) AND (vat_vnd >= 0) AND (total_vnd = (net_vnd + vat_vnd))))),
    CONSTRAINT crm_renewal_requests_price_source_check CHECK ((price_source = ANY (ARRAY['placeholder'::text, 'price_sheet'::text]))),
    CONSTRAINT crm_renewal_requests_payment_code_check CHECK (((payment_code IS NULL) OR (payment_code ~ '^[A-Z0-9]{6,20}$'::text))),
    CONSTRAINT crm_renewal_requests_transaction_ref_check CHECK (((transaction_ref IS NULL) OR (char_length(transaction_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_renewal_requests_hash_check CHECK (((request_hash IS NULL) OR (char_length(request_hash) = 64))),
    CONSTRAINT crm_renewal_requests_provider_ref_check CHECK (((provider_ref IS NULL) OR (char_length(provider_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_renewal_requests_outcome_note_check CHECK (((outcome_note IS NULL) OR (char_length(outcome_note) <= 1000))),
    CONSTRAINT crm_renewal_requests_paid_check CHECK (((state = ANY (ARRAY['awaiting_payment'::text, 'cancelled'::text])) OR (transaction_ref IS NOT NULL) OR (payment_code IS NULL)))
);

CREATE INDEX crm_renewal_requests_service ON public.crm_renewal_requests USING btree (workspace_id, crm_service_id, created_at DESC);

CREATE TRIGGER crm_services_set_updated_at BEFORE UPDATE ON public.crm_services FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_service_reminders_set_updated_at BEFORE UPDATE ON public.crm_service_reminders FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_provider_accounts_set_updated_at BEFORE UPDATE ON public.crm_provider_accounts FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_provider_links_set_updated_at BEFORE UPDATE ON public.crm_provider_links FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_renewal_requests_set_updated_at BEFORE UPDATE ON public.crm_renewal_requests FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Row level security forced on every crm table; the application role app_be reads and writes them, nobody else (as the baseline).
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_websites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_service_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_provider_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_provider_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_provider_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_renewal_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_customers FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_customers TO app_be;
REVOKE ALL ON TABLE public.crm_contacts FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_contacts TO app_be;
REVOKE ALL ON TABLE public.crm_websites FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_websites TO app_be;
REVOKE ALL ON TABLE public.crm_services FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_services TO app_be;
REVOKE ALL ON TABLE public.crm_service_reminders FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_service_reminders TO app_be;
REVOKE ALL ON TABLE public.crm_provider_accounts FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_provider_accounts TO app_be;
REVOKE ALL ON TABLE public.crm_provider_links FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_provider_links TO app_be;
REVOKE ALL ON TABLE public.crm_renewal_requests FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_renewal_requests TO app_be;
CREATE POLICY crm_customers_app_be_all ON public.crm_customers
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_contacts_app_be_all ON public.crm_contacts
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_websites_app_be_all ON public.crm_websites
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_services_app_be_all ON public.crm_services
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_service_reminders_app_be_all ON public.crm_service_reminders
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_provider_accounts_app_be_all ON public.crm_provider_accounts
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_provider_links_app_be_all ON public.crm_provider_links
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_renewal_requests_app_be_all ON public.crm_renewal_requests
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');

-- Every foreign key column leads an index (harness key rule).
create index if not exists crm_contacts_crm_customer_id_idx on public.crm_contacts (crm_customer_id);
create index if not exists crm_websites_crm_customer_id_idx on public.crm_websites (crm_customer_id);
create index if not exists crm_services_crm_customer_id_idx on public.crm_services (crm_customer_id);
create index if not exists crm_services_crm_website_id_idx on public.crm_services (crm_website_id);
create index if not exists crm_service_reminders_crm_service_id_idx on public.crm_service_reminders (crm_service_id);
create index if not exists crm_provider_links_crm_service_id_idx on public.crm_provider_links (crm_service_id);
create index if not exists crm_provider_links_crm_provider_account_id_idx on public.crm_provider_links (crm_provider_account_id);
create index if not exists crm_renewal_requests_crm_service_id_idx on public.crm_renewal_requests (crm_service_id);

-- ---- from 20261111190831_crm-books-documents-import.sql
-- nivo-web-lite CRM (projects, contracts, invoices, receivables, ledger balances, documents, import runs): converted from the holding project's 0001..0005 (never applied anywhere), 2026-11-12.
-- Tables live in schema public with the crm_ prefix; updated_at is set by private.set_updated_at() of the baseline.

-- 0003_projects-contracts-money: forward-only; never edited once applied. Expand only: five new tables in schema crm, nothing else touched.
-- The website builds of an enterprise, its contract register, its VAT invoices, the real receivables of projects in progress, and the account
-- balances of the books (TK131 customers, TK331 suppliers). Money is whole VND in bigint, dates are dates. A TK131 balance is NOT a debt
-- to collect (most are invoice errors the accountant must fix): reminders read public.crm_receivables, never public.crm_ledger_balances.

-- One website build (project code `<SITE>-WEB`), with the money the index workbook joined to it (value incl. VAT, collected, remaining).
CREATE TABLE public.crm_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    code text NOT NULL,
    crm_customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    crm_website_id uuid REFERENCES public.crm_websites(id) ON DELETE SET NULL,
    name text NOT NULL,
    contract_no text,
    contract_state text,
    value_vnd bigint,
    collected_vnd bigint,
    remaining_vnd bigint,
    starts_on date,
    ends_on date,
    status_text text,
    note text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_projects_code_key UNIQUE (workspace_id, code),
    CONSTRAINT crm_projects_code_check CHECK ((char_length(code) BETWEEN 1 AND 120)),
    CONSTRAINT crm_projects_name_check CHECK ((char_length(name) BETWEEN 1 AND 400)),
    CONSTRAINT crm_projects_money_check CHECK ((COALESCE(value_vnd, 0) >= 0) AND (COALESCE(collected_vnd, 0) >= 0)),
    CONSTRAINT crm_projects_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_projects_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_projects_customer ON public.crm_projects USING btree (workspace_id, crm_customer_id);

-- One contract of the register, keyed by its number as written. The partner is free text; `crm_customer_id` is set only when the partner
-- matches a customer's tax id or exact name.
CREATE TABLE public.crm_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    contract_no text NOT NULL,
    kind text NOT NULL,
    partner_name text,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    content text,
    value_vnd bigint,
    signed_on date,
    effective_on date,
    expires_on date,
    auto_renew boolean,
    warranty_until date,
    owner_name text,
    status_text text,
    storage_ref text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_contracts_contract_no_key UNIQUE (workspace_id, contract_no),
    CONSTRAINT crm_contracts_contract_no_check CHECK ((char_length(contract_no) BETWEEN 1 AND 120)),
    CONSTRAINT crm_contracts_kind_check CHECK ((kind = ANY (ARRAY['sale'::text, 'purchase'::text, 'labour'::text, 'nda'::text, 'dpa'::text, 'other'::text]))),
    CONSTRAINT crm_contracts_value_check CHECK ((COALESCE(value_vnd, 0) >= 0)),
    CONSTRAINT crm_contracts_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_contracts_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_contracts_customer ON public.crm_contracts USING btree (workspace_id, crm_customer_id) WHERE (crm_customer_id IS NOT NULL);

-- One VAT invoice the enterprise issued (in MISA), keyed by its number (`000000NN`): the total of its ledger lines (revenue + VAT) when the
-- TK131 ledger books it, and the stored PDF when a customer folder holds it.
CREATE TABLE public.crm_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    invoice_no text NOT NULL,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    issued_on date,
    amount_vnd bigint,
    document_path text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_invoices_invoice_no_key UNIQUE (workspace_id, invoice_no),
    CONSTRAINT crm_invoices_invoice_no_check CHECK ((invoice_no ~ '^[0-9]{8}$'::text)),
    CONSTRAINT crm_invoices_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_invoices_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_invoices_customer ON public.crm_invoices USING btree (workspace_id, crm_customer_id, issued_on DESC) WHERE (crm_customer_id IS NOT NULL);

-- One real receivable of a project in progress (the collection list), keyed by its project code. `due_on` is not in the source today.
CREATE TABLE public.crm_receivables (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    project_code text NOT NULL,
    crm_project_id uuid REFERENCES public.crm_projects(id) ON DELETE SET NULL,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    contract_ref text,
    total_vnd bigint NOT NULL,
    collected_vnd bigint NOT NULL,
    remaining_vnd bigint NOT NULL,
    due_on date,
    invoiced_note text,
    project_state text,
    sales_owner text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_receivables_project_code_key UNIQUE (workspace_id, project_code),
    CONSTRAINT crm_receivables_money_check CHECK (((total_vnd >= 0) AND (collected_vnd >= 0))),
    CONSTRAINT crm_receivables_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_receivables_source_hash_check CHECK ((char_length(source_hash) = 64))
);

-- One account balance of the books for one party (TK131: a customer code; TK331: a supplier code) over the ledger's period.
CREATE TABLE public.crm_ledger_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    account text NOT NULL,
    party_code text NOT NULL,
    party_name text,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    opening_debit_vnd bigint NOT NULL,
    opening_credit_vnd bigint NOT NULL,
    debit_vnd bigint NOT NULL,
    credit_vnd bigint NOT NULL,
    closing_debit_vnd bigint NOT NULL,
    closing_credit_vnd bigint NOT NULL,
    note text,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_ledger_balances_account_party_key UNIQUE (workspace_id, account, party_code),
    CONSTRAINT crm_ledger_balances_account_check CHECK ((account = ANY (ARRAY['131'::text, '331'::text]))),
    CONSTRAINT crm_ledger_balances_party_code_check CHECK ((char_length(party_code) BETWEEN 1 AND 80)),
    CONSTRAINT crm_ledger_balances_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_ledger_balances_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_ledger_balances_customer ON public.crm_ledger_balances USING btree (workspace_id, crm_customer_id) WHERE (crm_customer_id IS NOT NULL);

CREATE TRIGGER crm_projects_set_updated_at BEFORE UPDATE ON public.crm_projects FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_contracts_set_updated_at BEFORE UPDATE ON public.crm_contracts FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_invoices_set_updated_at BEFORE UPDATE ON public.crm_invoices FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_receivables_set_updated_at BEFORE UPDATE ON public.crm_receivables FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_ledger_balances_set_updated_at BEFORE UPDATE ON public.crm_ledger_balances FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 0004_documents-import: forward-only; never edited once applied. Expand only: four new tables in schema crm, nothing else touched.
-- The documents of the customer folders (a REFERENCE: the relative path, the kind, the invoice or contract number its name carries; never
-- the content), and the import's own record: one row per executed run, one row per source row or cell the import could not take (never a
-- silent drop: the raw cells stay here, in the database only), and the values a changed source row replaced.

CREATE TABLE public.crm_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    path text NOT NULL,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    kind text NOT NULL,
    invoice_no text,
    contract_no text,
    file_name text NOT NULL,
    size_bytes bigint NOT NULL,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    source_hash text NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_documents_path_key UNIQUE (workspace_id, path),
    CONSTRAINT crm_documents_path_check CHECK ((char_length(path) BETWEEN 1 AND 1000)),
    CONSTRAINT crm_documents_kind_check CHECK ((kind = ANY (ARRAY['invoice'::text, 'invoice_replacement'::text, 'contract'::text, 'quote'::text, 'minutes'::text, 'note'::text, 'other'::text]))),
    CONSTRAINT crm_documents_size_check CHECK ((size_bytes >= 0)),
    CONSTRAINT crm_documents_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_documents_source_hash_check CHECK ((char_length(source_hash) = 64))
);

CREATE INDEX crm_documents_customer ON public.crm_documents USING btree (workspace_id, crm_customer_id, kind) WHERE (crm_customer_id IS NOT NULL);

-- One executed import run: the folder's name (not its path), when, and the counts it reported.
CREATE TABLE public.crm_import_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    source_label text NOT NULL,
    started_at timestamptz NOT NULL,
    finished_at timestamptz,
    counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_import_runs_label_check CHECK ((char_length(source_label) BETWEEN 1 AND 200)),
    CONSTRAINT crm_import_runs_counts_check CHECK ((jsonb_typeof(counts) = 'object'::text))
);

-- One source row (or one cell of it, `field`) the import could not take: `rejected` = the row was not imported, `warning` = imported with
-- that field left empty or a placeholder. Keyed by its place and reason, so a re-run updates the same row and never adds a duplicate.
CREATE TABLE public.crm_import_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    source_file text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL,
    field text DEFAULT ''::text NOT NULL,
    reason text NOT NULL,
    severity text NOT NULL,
    entity text NOT NULL,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_import_run_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_import_issues_place_key UNIQUE (workspace_id, source_file, source_sheet, source_row, field, reason),
    CONSTRAINT crm_import_issues_reason_check CHECK ((char_length(reason) BETWEEN 1 AND 60)),
    CONSTRAINT crm_import_issues_severity_check CHECK ((severity = ANY (ARRAY['rejected'::text, 'warning'::text]))),
    CONSTRAINT crm_import_issues_raw_check CHECK ((jsonb_typeof(raw) = 'object'::text))
);

-- The values one changed source row replaced (`before`) and what it wrote (`after`), per run.
CREATE TABLE public.crm_import_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_import_run_id uuid NOT NULL REFERENCES public.crm_import_runs(id) ON DELETE CASCADE,
    entity text NOT NULL,
    entity_key text NOT NULL,
    before jsonb NOT NULL,
    after jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_import_changes_entity_check CHECK ((char_length(entity) BETWEEN 1 AND 40))
);

CREATE INDEX crm_import_changes_entity ON public.crm_import_changes USING btree (workspace_id, entity, entity_key, created_at DESC);

CREATE TRIGGER crm_documents_set_updated_at BEFORE UPDATE ON public.crm_documents FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_import_runs_set_updated_at BEFORE UPDATE ON public.crm_import_runs FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_import_issues_set_updated_at BEFORE UPDATE ON public.crm_import_issues FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Row level security forced on every crm table; the application role app_be reads and writes them, nobody else (as the baseline).
ALTER TABLE public.crm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receivables FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ledger_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ledger_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_changes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_projects FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_projects TO app_be;
REVOKE ALL ON TABLE public.crm_contracts FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_contracts TO app_be;
REVOKE ALL ON TABLE public.crm_invoices FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_invoices TO app_be;
REVOKE ALL ON TABLE public.crm_receivables FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_receivables TO app_be;
REVOKE ALL ON TABLE public.crm_ledger_balances FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_ledger_balances TO app_be;
REVOKE ALL ON TABLE public.crm_documents FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_documents TO app_be;
REVOKE ALL ON TABLE public.crm_import_runs FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_import_runs TO app_be;
REVOKE ALL ON TABLE public.crm_import_issues FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_import_issues TO app_be;
REVOKE ALL ON TABLE public.crm_import_changes FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_import_changes TO app_be;
CREATE POLICY crm_projects_app_be_all ON public.crm_projects
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_contracts_app_be_all ON public.crm_contracts
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_invoices_app_be_all ON public.crm_invoices
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_receivables_app_be_all ON public.crm_receivables
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_ledger_balances_app_be_all ON public.crm_ledger_balances
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_documents_app_be_all ON public.crm_documents
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_import_runs_app_be_all ON public.crm_import_runs
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_import_issues_app_be_all ON public.crm_import_issues
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_import_changes_app_be_all ON public.crm_import_changes
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');

-- Every foreign key column leads an index (harness key rule).
create index if not exists crm_projects_crm_customer_id_idx on public.crm_projects (crm_customer_id);
create index if not exists crm_projects_crm_website_id_idx on public.crm_projects (crm_website_id);
create index if not exists crm_contracts_crm_customer_id_idx on public.crm_contracts (crm_customer_id);
create index if not exists crm_invoices_crm_customer_id_idx on public.crm_invoices (crm_customer_id);
create index if not exists crm_receivables_crm_project_id_idx on public.crm_receivables (crm_project_id);
create index if not exists crm_receivables_crm_customer_id_idx on public.crm_receivables (crm_customer_id);
create index if not exists crm_ledger_balances_crm_customer_id_idx on public.crm_ledger_balances (crm_customer_id);
create index if not exists crm_documents_crm_customer_id_idx on public.crm_documents (crm_customer_id);
create index if not exists crm_import_changes_crm_import_run_id_idx on public.crm_import_changes (crm_import_run_id);

-- ---- from 20261111190832_crm-collections-tickets-drafts.sql
-- nivo-web-lite CRM (reminder keys, contact keys, notices, payments, payable notes, tickets, invoice drafts): converted from the holding project's 0001..0005 (never applied anywhere), 2026-11-12.
-- Tables live in schema public with the crm_ prefix; updated_at is set by private.set_updated_at() of the baseline.

CREATE UNIQUE INDEX crm_service_reminders_request_key ON public.crm_service_reminders USING btree (workspace_id, request_key) WHERE (request_key IS NOT NULL);

-- A contact is linked once per customer and address: the link operation upserts on these.
CREATE UNIQUE INDEX crm_contacts_zalo_key ON public.crm_contacts USING btree (workspace_id, crm_customer_id, zalo_id) WHERE (zalo_id IS NOT NULL);

CREATE UNIQUE INDEX crm_contacts_email_key ON public.crm_contacts USING btree (workspace_id, crm_customer_id, email) WHERE (email IS NOT NULL);

CREATE UNIQUE INDEX crm_contacts_phone_key ON public.crm_contacts USING btree (workspace_id, crm_customer_id, phone) WHERE (phone IS NOT NULL);

CREATE UNIQUE INDEX crm_renewal_requests_payment_code_key ON public.crm_renewal_requests USING btree (workspace_id, payment_code) WHERE (payment_code IS NOT NULL);

CREATE UNIQUE INDEX crm_renewal_requests_transaction_ref_key ON public.crm_renewal_requests USING btree (workspace_id, transaction_ref) WHERE (transaction_ref IS NOT NULL);

-- The open requests list (awaiting payment, paid, waiting for a person).
CREATE INDEX crm_renewal_requests_open ON public.crm_renewal_requests USING btree (workspace_id, created_at, id) WHERE (state = ANY (ARRAY['awaiting_payment'::text, 'paid'::text, 'pending_person'::text]));

-- A notice sent about a real receivable (a project's collection): the channel and the message reference, never the words.
CREATE TABLE public.crm_receivable_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_receivable_id uuid NOT NULL REFERENCES public.crm_receivables(id) ON DELETE CASCADE,
    channel text NOT NULL,
    message_ref text,
    sent_at timestamptz NOT NULL,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_receivable_notices_request_key_key UNIQUE (workspace_id, request_key),
    CONSTRAINT crm_receivable_notices_channel_check CHECK ((channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text]))),
    CONSTRAINT crm_receivable_notices_message_ref_check CHECK (((message_ref IS NULL) OR (char_length(message_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_receivable_notices_request_key_check CHECK ((char_length(request_key) BETWEEN 1 AND 200)),
    CONSTRAINT crm_receivable_notices_request_hash_check CHECK ((char_length(request_hash) = 64))
);

CREATE INDEX crm_receivable_notices_receivable ON public.crm_receivable_notices USING btree (workspace_id, crm_receivable_id, sent_at DESC);

-- A payment recorded against a real receivable: the bank row's reference only. The imported amounts are not changed by it (the books stay
-- the authority on collected / remaining until the next import).
CREATE TABLE public.crm_receivable_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_receivable_id uuid NOT NULL REFERENCES public.crm_receivables(id) ON DELETE CASCADE,
    transaction_ref text NOT NULL,
    recorded_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_receivable_payments_transaction_ref_key UNIQUE (workspace_id, transaction_ref),
    CONSTRAINT crm_receivable_payments_transaction_ref_check CHECK ((char_length(transaction_ref) BETWEEN 1 AND 200))
);

CREATE INDEX crm_receivable_payments_receivable ON public.crm_receivable_payments USING btree (workspace_id, crm_receivable_id);

-- A supplier invoice noted against a TK331 party (the e-invoice reference and the invoice number; the amount stays in the e-invoice).
CREATE TABLE public.crm_payable_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    party_code text NOT NULL,
    invoice_no text,
    issued_on date,
    einvoice_ref text,
    note text,
    recorded_at timestamptz NOT NULL,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_payable_notes_request_key_key UNIQUE (workspace_id, request_key),
    CONSTRAINT crm_payable_notes_party_code_check CHECK ((char_length(party_code) BETWEEN 1 AND 80)),
    CONSTRAINT crm_payable_notes_invoice_no_check CHECK (((invoice_no IS NULL) OR (char_length(invoice_no) BETWEEN 1 AND 40))),
    CONSTRAINT crm_payable_notes_einvoice_ref_check CHECK (((einvoice_ref IS NULL) OR (char_length(einvoice_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_payable_notes_note_check CHECK (((note IS NULL) OR (char_length(note) <= 1000))),
    CONSTRAINT crm_payable_notes_request_key_check CHECK ((char_length(request_key) BETWEEN 1 AND 200)),
    CONSTRAINT crm_payable_notes_request_hash_check CHECK ((char_length(request_hash) = 64))
);

CREATE INDEX crm_payable_notes_party ON public.crm_payable_notes USING btree (workspace_id, party_code, recorded_at DESC);

-- A support ticket: opened by the desk flow from a conversation or a mail, worked by people. crm_customer_id is null when the sender is not
-- a known customer yet. service_ids are the services it concerns (same workspace).
CREATE TABLE public.crm_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    service_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    channel text NOT NULL,
    source_ref text,
    subject text NOT NULL,
    summary text NOT NULL,
    opened_at timestamptz NOT NULL,
    closed_at timestamptz,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_tickets_request_key_key UNIQUE (workspace_id, request_key),
    CONSTRAINT crm_tickets_kind_check CHECK ((kind = ANY (ARRAY['fault'::text, 'complaint'::text, 'question'::text, 'request'::text]))),
    CONSTRAINT crm_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting_customer'::text, 'quoted'::text, 'resolved'::text, 'closed'::text]))),
    CONSTRAINT crm_tickets_channel_check CHECK ((channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text, 'chat'::text]))),
    CONSTRAINT crm_tickets_service_ids_check CHECK ((cardinality(service_ids) <= 20)),
    CONSTRAINT crm_tickets_source_ref_check CHECK (((source_ref IS NULL) OR (char_length(source_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_tickets_subject_check CHECK ((char_length(subject) BETWEEN 1 AND 200)),
    CONSTRAINT crm_tickets_summary_check CHECK ((char_length(summary) <= 4000)),
    CONSTRAINT crm_tickets_closed_check CHECK (((closed_at IS NULL) = (status <> 'closed'::text))),
    CONSTRAINT crm_tickets_request_key_check CHECK ((char_length(request_key) BETWEEN 1 AND 200)),
    CONSTRAINT crm_tickets_request_hash_check CHECK ((char_length(request_hash) = 64))
);

CREATE INDEX crm_tickets_opened ON public.crm_tickets USING btree (workspace_id, opened_at DESC, id DESC);

CREATE INDEX crm_tickets_customer ON public.crm_tickets USING btree (workspace_id, crm_customer_id) WHERE (crm_customer_id IS NOT NULL);

-- A note or a status change on a ticket, by the person or agent named in `author`.
CREATE TABLE public.crm_ticket_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_ticket_id uuid NOT NULL REFERENCES public.crm_tickets(id) ON DELETE CASCADE,
    body text,
    status_from text,
    status_to text,
    author text NOT NULL,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_ticket_notes_request_key_key UNIQUE (workspace_id, request_key),
    CONSTRAINT crm_ticket_notes_body_check CHECK (((body IS NULL) OR (char_length(body) BETWEEN 1 AND 4000))),
    CONSTRAINT crm_ticket_notes_change_check CHECK (((body IS NOT NULL) OR (status_to IS NOT NULL))),
    CONSTRAINT crm_ticket_notes_author_check CHECK ((char_length(author) BETWEEN 1 AND 120)),
    CONSTRAINT crm_ticket_notes_request_key_check CHECK ((char_length(request_key) BETWEEN 1 AND 200)),
    CONSTRAINT crm_ticket_notes_request_hash_check CHECK ((char_length(request_hash) = 64))
);

CREATE INDEX crm_ticket_notes_ticket ON public.crm_ticket_notes USING btree (workspace_id, crm_ticket_id, created_at);

-- The invoice draft of one renewal: lines and amounts computed by the CRM from the renewal (data only; issuing is a later provider).
CREATE TABLE public.crm_invoice_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_renewal_request_id uuid NOT NULL REFERENCES public.crm_renewal_requests(id) ON DELETE CASCADE,
    crm_customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    lines jsonb NOT NULL,
    net_vnd bigint NOT NULL,
    vat_rate_percent integer NOT NULL,
    vat_vnd bigint NOT NULL,
    total_vnd bigint NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    price_source text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_invoice_drafts_renewal_key UNIQUE (workspace_id, crm_renewal_request_id),
    CONSTRAINT crm_invoice_drafts_lines_check CHECK (((jsonb_typeof(lines) = 'array'::text) AND (jsonb_array_length(lines) BETWEEN 1 AND 20))),
    CONSTRAINT crm_invoice_drafts_money_check CHECK (((net_vnd >= 0) AND (vat_vnd >= 0) AND (total_vnd = (net_vnd + vat_vnd)))),
    CONSTRAINT crm_invoice_drafts_vat_check CHECK ((vat_rate_percent BETWEEN 0 AND 100)),
    CONSTRAINT crm_invoice_drafts_price_source_check CHECK ((price_source = ANY (ARRAY['placeholder'::text, 'price_sheet'::text])))
);

CREATE TRIGGER crm_receivable_notices_set_updated_at BEFORE UPDATE ON public.crm_receivable_notices FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_receivable_payments_set_updated_at BEFORE UPDATE ON public.crm_receivable_payments FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_payable_notes_set_updated_at BEFORE UPDATE ON public.crm_payable_notes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_tickets_set_updated_at BEFORE UPDATE ON public.crm_tickets FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_ticket_notes_set_updated_at BEFORE UPDATE ON public.crm_ticket_notes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER crm_invoice_drafts_set_updated_at BEFORE UPDATE ON public.crm_invoice_drafts FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Row level security forced on every crm table; the application role app_be reads and writes them, nobody else (as the baseline).
ALTER TABLE public.crm_receivable_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receivable_notices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receivable_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payable_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payable_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ticket_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoice_drafts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_receivable_notices FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_receivable_notices TO app_be;
REVOKE ALL ON TABLE public.crm_receivable_payments FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_receivable_payments TO app_be;
REVOKE ALL ON TABLE public.crm_payable_notes FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_payable_notes TO app_be;
REVOKE ALL ON TABLE public.crm_tickets FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_tickets TO app_be;
REVOKE ALL ON TABLE public.crm_ticket_notes FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_ticket_notes TO app_be;
REVOKE ALL ON TABLE public.crm_invoice_drafts FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_invoice_drafts TO app_be;
CREATE POLICY crm_receivable_notices_app_be_all ON public.crm_receivable_notices
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_receivable_payments_app_be_all ON public.crm_receivable_payments
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_payable_notes_app_be_all ON public.crm_payable_notes
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_tickets_app_be_all ON public.crm_tickets
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_ticket_notes_app_be_all ON public.crm_ticket_notes
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_invoice_drafts_app_be_all ON public.crm_invoice_drafts
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');

-- Every foreign key column leads an index (harness key rule).
create index if not exists crm_receivable_notices_crm_receivable_id_idx on public.crm_receivable_notices (crm_receivable_id);
create index if not exists crm_receivable_payments_crm_receivable_id_idx on public.crm_receivable_payments (crm_receivable_id);
create index if not exists crm_tickets_crm_customer_id_idx on public.crm_tickets (crm_customer_id);
create index if not exists crm_ticket_notes_crm_ticket_id_idx on public.crm_ticket_notes (crm_ticket_id);
create index if not exists crm_invoice_drafts_crm_renewal_request_id_idx on public.crm_invoice_drafts (crm_renewal_request_id);
create index if not exists crm_invoice_drafts_crm_customer_id_idx on public.crm_invoice_drafts (crm_customer_id);

-- ---- from 20261111201809_crm-backup-functions.sql
-- The table-shaped backup of the CRM (format nivo-web-lite-data@2): three functions the backup service calls through
-- callDbFunction, because an entity cannot express a generic, column-for-column copy (ids, workspace ids and the two
-- database-set timestamps included). Each refuses a table outside the fixed list before any dynamic statement is built,
-- quotes the name with format('%I'), and runs as the caller (SECURITY INVOKER), so app_be's grants and row policies apply.

-- The CRM tables a backup copies, in restore order (a table after every table it references).
CREATE FUNCTION public.crm_backup_tables()
    RETURNS TABLE(table_name text)
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select t from unnest(array[
    'crm_customers', 'crm_contacts', 'crm_websites', 'crm_services', 'crm_service_reminders', 'crm_provider_accounts',
    'crm_provider_links', 'crm_renewal_requests', 'crm_projects', 'crm_contracts', 'crm_invoices', 'crm_receivables',
    'crm_ledger_balances', 'crm_documents', 'crm_import_runs', 'crm_import_issues', 'crm_import_changes',
    'crm_receivable_notices', 'crm_receivable_payments', 'crm_payable_notes', 'crm_tickets', 'crm_ticket_notes',
    'crm_invoice_drafts'
  ]) with ordinality as listed(t, position) order by position;
$$;

-- Refuses a table that is not a CRM backup table.
CREATE FUNCTION public.crm_backup_assert_table(p_table text)
    RETURNS void
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  if not exists (select 1 from public.crm_backup_tables() as listed where listed.table_name = p_table) then
    raise exception 'crm backup: unknown table %', p_table using errcode = '42P01';
  end if;
end;
$$;

-- One page of a table as JSON rows (every column, column names as stored), ordered by id, after p_after (null: from the start).
CREATE FUNCTION public.crm_backup_page(p_table text, p_after uuid, p_limit integer)
    RETURNS TABLE(row_data jsonb)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  perform public.crm_backup_assert_table(p_table);
  return query execute format(
    'select to_jsonb(t) from public.%I as t where $1 is null or t.id > $1 order by t.id limit $2', p_table
  ) using p_after, p_limit;
end;
$$;

-- The number of rows of a table.
CREATE FUNCTION public.crm_backup_count(p_table text)
    RETURNS TABLE(row_count bigint)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  perform public.crm_backup_assert_table(p_table);
  return query execute format('select count(*) from public.%I', p_table);
end;
$$;

-- Inserts JSON rows into a table exactly as a page answered them (ids and timestamps kept); answers the rows inserted.
CREATE FUNCTION public.crm_backup_insert(p_table text, p_rows jsonb)
    RETURNS TABLE(inserted bigint)
    LANGUAGE plpgsql VOLATILE
    SET search_path TO ''
    AS $$
declare
  v_count bigint;
begin
  perform public.crm_backup_assert_table(p_table);
  execute format(
    'insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I, $1)', p_table
  ) using p_rows;
  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.crm_backup_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_tables() TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_assert_table(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_assert_table(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_page(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_page(text, uuid, integer) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_count(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_count(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_insert(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_insert(text, jsonb) TO app_be;

-- ---- from 20261111201810_crm-service-credentials.sql
-- One CRM service credential per enterprise workspace (owner 2026-11-12: many workspaces, one CRM). The bearer a caller
-- presents is `<id>.<secret>`; only the sha256 of the secret is stored, compared in constant time. A credential acts for its
-- one workspace, which scopes every query; a revoked credential is refused. Issued and revoked by the cli (`credential`).
CREATE TABLE public.crm_service_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    label text NOT NULL,
    secret_sha256 text NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_service_credentials_label_check CHECK ((char_length(label) BETWEEN 1 AND 120)),
    CONSTRAINT crm_service_credentials_secret_sha256_check CHECK ((secret_sha256 ~ '^[0-9a-f]{64}$'))
);

CREATE INDEX crm_service_credentials_workspace ON public.crm_service_credentials USING btree (workspace_id, created_at);

CREATE TRIGGER crm_service_credentials_set_updated_at BEFORE UPDATE ON public.crm_service_credentials FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.crm_service_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_service_credentials FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.crm_service_credentials FROM public;
GRANT SELECT, INSERT, UPDATE ON TABLE public.crm_service_credentials TO app_be;

CREATE POLICY crm_service_credentials_app_be_all ON public.crm_service_credentials
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');

-- The backup copies the credentials table too (hashes only, never a secret): the list gains it, after its workspace's rows.
CREATE OR REPLACE FUNCTION public.crm_backup_tables()
    RETURNS TABLE(table_name text)
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select t from unnest(array[
    'crm_customers', 'crm_contacts', 'crm_websites', 'crm_services', 'crm_service_reminders', 'crm_provider_accounts',
    'crm_provider_links', 'crm_renewal_requests', 'crm_projects', 'crm_contracts', 'crm_invoices', 'crm_receivables',
    'crm_ledger_balances', 'crm_documents', 'crm_import_runs', 'crm_import_issues', 'crm_import_changes',
    'crm_receivable_notices', 'crm_receivable_payments', 'crm_payable_notes', 'crm_tickets', 'crm_ticket_notes',
    'crm_invoice_drafts', 'crm_service_credentials'
  ]) with ordinality as listed(t, position) order by position;
$$;

-- ---- from 20261111201811_crm-documents-storage.sql
-- The original binaries of the CRM documents (contract and invoice PDFs, scans) live in the app's private object storage
-- (MinIO in dev, the S3-compatible store in production; owner 2026-11-12), content-addressed per workspace:
-- `<workspace_id>/documents/<sha256>`. A document row keeps the sha256 of its file, the storage key once uploaded and when.
ALTER TABLE public.crm_documents
    ADD COLUMN sha256 text,
    ADD COLUMN storage_key text,
    ADD COLUMN stored_at timestamptz,
    ADD CONSTRAINT crm_documents_sha256_check CHECK (((sha256 IS NULL) OR (sha256 ~ '^[0-9a-f]{64}$'))),
    ADD CONSTRAINT crm_documents_storage_key_check CHECK (((storage_key IS NULL) OR ((sha256 IS NOT NULL) AND (storage_key = ((workspace_id)::text || '/documents/' || sha256))))),
    ADD CONSTRAINT crm_documents_stored_check CHECK (((storage_key IS NULL) = (stored_at IS NULL)));

-- ---- from 20261111201812_crm-snapshot-fidelity.sql
-- What the CRM needs to emit the data repository's format nivo-web-lite-data@1 exactly (the backup of record, owner 2026-11-12:
-- backup = push to the data repository): a money value the source does not have stays null (no longer zero), an invoice keeps the
-- customer code the source wrote even when no customer matches (a soft reference), a provider account keeps its plugin, and a
-- contact keeps its role and its source place.
ALTER TABLE public.crm_receivables
    ALTER COLUMN total_vnd DROP NOT NULL,
    ALTER COLUMN collected_vnd DROP NOT NULL,
    ALTER COLUMN remaining_vnd DROP NOT NULL;

ALTER TABLE public.crm_ledger_balances
    ALTER COLUMN opening_debit_vnd DROP NOT NULL,
    ALTER COLUMN opening_credit_vnd DROP NOT NULL,
    ALTER COLUMN debit_vnd DROP NOT NULL,
    ALTER COLUMN credit_vnd DROP NOT NULL,
    ALTER COLUMN closing_debit_vnd DROP NOT NULL,
    ALTER COLUMN closing_credit_vnd DROP NOT NULL;

ALTER TABLE public.crm_invoices
    ADD COLUMN customer_code text,
    ADD CONSTRAINT crm_invoices_customer_code_check CHECK (((customer_code IS NULL) OR (char_length(customer_code) BETWEEN 1 AND 80)));

ALTER TABLE public.crm_provider_accounts
    ADD COLUMN plugin text;

ALTER TABLE public.crm_contacts
    ADD COLUMN role text,
    ADD COLUMN source_file text,
    ADD COLUMN source_sheet text,
    ADD COLUMN source_row integer,
    ADD CONSTRAINT crm_contacts_source_row_check CHECK (((source_row IS NULL) OR (source_row >= 0)));

-- ---- from 20261111201813_crm-purchases.sql
-- A NEW sale as ONE request object, `purchase`, the twin of a renewal request (AGENTS-GRAPHS §9.1-5, §9.7):
-- enquiry -> quoted -> awaiting_payment -> paid -> pending_person -> delivered, or lost / cancelled. No tool takes an amount: the
-- quote is computed from the price table. Its follow-ups are kept one per day. An invoice draft may now be drafted for a purchase.
CREATE TABLE public.crm_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    code text NOT NULL,
    state text NOT NULL,
    channel text NOT NULL,
    source_ref text NOT NULL,
    need text NOT NULL,
    contact_name text,
    phone text,
    email text,
    domain text,
    customer_code text,
    crm_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    lines jsonb,
    net_vnd bigint,
    vat_rate_percent integer,
    vat_vnd bigint,
    total_vnd bigint,
    price_source text,
    quoted_on date,
    valid_until date,
    payment_code text,
    transaction_ref text,
    paid_at timestamptz,
    accepted_at timestamptz,
    project_code text,
    contract_no text,
    note text,
    confirmed_by text,
    confirmed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_purchases_code_key UNIQUE (workspace_id, code),
    CONSTRAINT crm_purchases_code_check CHECK ((code ~ '^MUA-[A-Z0-9]{8}$'::text)),
    CONSTRAINT crm_purchases_state_check CHECK ((state = ANY (ARRAY['enquiry'::text, 'quoted'::text, 'awaiting_payment'::text, 'paid'::text, 'pending_person'::text, 'delivered'::text, 'lost'::text, 'cancelled'::text]))),
    CONSTRAINT crm_purchases_channel_check CHECK ((channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text, 'web'::text, 'other'::text]))),
    CONSTRAINT crm_purchases_source_ref_check CHECK ((char_length(source_ref) BETWEEN 1 AND 200)),
    CONSTRAINT crm_purchases_need_check CHECK ((char_length(need) BETWEEN 1 AND 4000)),
    CONSTRAINT crm_purchases_lines_check CHECK (((lines IS NULL) OR ((jsonb_typeof(lines) = 'array'::text) AND (jsonb_array_length(lines) BETWEEN 1 AND 20)))),
    CONSTRAINT crm_purchases_money_check CHECK (((net_vnd IS NULL) OR ((net_vnd >= 0) AND (vat_vnd >= 0) AND (total_vnd = (net_vnd + vat_vnd))))),
    CONSTRAINT crm_purchases_price_source_check CHECK (((price_source IS NULL) OR (price_source = ANY (ARRAY['placeholder'::text, 'price_sheet'::text])))),
    CONSTRAINT crm_purchases_payment_code_check CHECK (((payment_code IS NULL) OR (payment_code ~ '^[A-Z0-9]{6,20}$'::text))),
    CONSTRAINT crm_purchases_transaction_ref_check CHECK (((transaction_ref IS NULL) OR (char_length(transaction_ref) BETWEEN 1 AND 200))),
    CONSTRAINT crm_purchases_note_check CHECK (((note IS NULL) OR (char_length(note) <= 1000)))
);

CREATE INDEX crm_purchases_open ON public.crm_purchases USING btree (workspace_id, state, id);
CREATE UNIQUE INDEX crm_purchases_open_source_key ON public.crm_purchases USING btree (workspace_id, channel, source_ref)
    WHERE (state = ANY (ARRAY['enquiry'::text, 'quoted'::text, 'awaiting_payment'::text, 'paid'::text, 'pending_person'::text]));
CREATE UNIQUE INDEX crm_purchases_payment_code_key ON public.crm_purchases USING btree (workspace_id, payment_code) WHERE (payment_code IS NOT NULL);
CREATE UNIQUE INDEX crm_purchases_transaction_ref_key ON public.crm_purchases USING btree (workspace_id, transaction_ref) WHERE (transaction_ref IS NOT NULL);

CREATE TABLE public.crm_purchase_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    crm_purchase_id uuid NOT NULL REFERENCES public.crm_purchases(id) ON DELETE CASCADE,
    day date NOT NULL,
    channel text NOT NULL,
    outcome text NOT NULL,
    message_ref text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_purchase_followups_day_key UNIQUE (workspace_id, crm_purchase_id, day),
    CONSTRAINT crm_purchase_followups_channel_check CHECK ((channel = ANY (ARRAY['zalo'::text, 'email'::text, 'phone'::text, 'web'::text, 'other'::text]))),
    CONSTRAINT crm_purchase_followups_outcome_check CHECK ((outcome = ANY (ARRAY['sent'::text, 'answered'::text, 'no_answer'::text, 'declined'::text]))),
    CONSTRAINT crm_purchase_followups_message_ref_check CHECK (((message_ref IS NULL) OR (char_length(message_ref) BETWEEN 1 AND 200)))
);

CREATE TRIGGER crm_purchases_set_updated_at BEFORE UPDATE ON public.crm_purchases FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER crm_purchase_followups_set_updated_at BEFORE UPDATE ON public.crm_purchase_followups FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.crm_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_purchase_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_purchase_followups FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.crm_purchases FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_purchases TO app_be;
REVOKE ALL ON TABLE public.crm_purchase_followups FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_purchase_followups TO app_be;

CREATE POLICY crm_purchases_app_be_all ON public.crm_purchases
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');
CREATE POLICY crm_purchase_followups_app_be_all ON public.crm_purchase_followups
    FOR ALL TO app_be USING (current_user = 'app_be') WITH CHECK (current_user = 'app_be');

-- An invoice draft is drafted for a renewal OR a purchase (exactly one), one draft each.
ALTER TABLE public.crm_invoice_drafts
    ALTER COLUMN crm_renewal_request_id DROP NOT NULL,
    ADD COLUMN crm_purchase_id uuid REFERENCES public.crm_purchases(id) ON DELETE CASCADE,
    ADD CONSTRAINT crm_invoice_drafts_subject_check CHECK (((crm_renewal_request_id IS NULL) <> (crm_purchase_id IS NULL)));
CREATE UNIQUE INDEX crm_invoice_drafts_purchase_key ON public.crm_invoice_drafts USING btree (workspace_id, crm_purchase_id) WHERE (crm_purchase_id IS NOT NULL);

-- The backup copies the purchase tables too (after their customers, before the invoice drafts that reference them).
CREATE OR REPLACE FUNCTION public.crm_backup_tables()
    RETURNS TABLE(table_name text)
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select t from unnest(array[
    'crm_customers', 'crm_contacts', 'crm_websites', 'crm_services', 'crm_service_reminders', 'crm_provider_accounts',
    'crm_provider_links', 'crm_renewal_requests', 'crm_projects', 'crm_contracts', 'crm_invoices', 'crm_receivables',
    'crm_ledger_balances', 'crm_documents', 'crm_import_runs', 'crm_import_issues', 'crm_import_changes',
    'crm_receivable_notices', 'crm_receivable_payments', 'crm_payable_notes', 'crm_tickets', 'crm_ticket_notes',
    'crm_purchases', 'crm_purchase_followups', 'crm_invoice_drafts', 'crm_service_credentials'
  ]) with ordinality as listed(t, position) order by position;
$$;

-- Every foreign key column leads an index (harness key rule).
create index if not exists crm_purchases_crm_customer_id_idx on public.crm_purchases (crm_customer_id);
create index if not exists crm_purchase_followups_crm_purchase_id_idx on public.crm_purchase_followups (crm_purchase_id);

-- ---- from 20261111201815_crm-purchases-source-hash.sql
-- A purchase and a follow-up imported from the data repository keep the sha256 of their item, so a second import of the same
-- snapshot finds them unchanged (as every other imported table does); a purchase the CRM opened itself has none.
ALTER TABLE public.crm_purchases
    ADD COLUMN source_hash text,
    ADD CONSTRAINT crm_purchases_source_hash_check CHECK (((source_hash IS NULL) OR (char_length(source_hash) = 64)));

ALTER TABLE public.crm_purchase_followups
    ADD COLUMN source_hash text,
    ADD CONSTRAINT crm_purchase_followups_source_hash_check CHECK (((source_hash IS NULL) OR (char_length(source_hash) = 64)));

-- ---- from 20261114120000_crm-invoice-issued.sql
-- An invoice draft RECORDS the e-invoice issued for it (owner ruling R57, 2026-11-14: the Accounting agent issues the invoice at
-- MISA meInvoice and writes the result into the CRM, which issues nothing): its number (unique in the workspace), the provider's
-- reference and the issue date. A draft holds all three or none of number and date.
ALTER TABLE public.crm_invoice_drafts
    ADD COLUMN invoice_no text,
    ADD COLUMN provider_ref text,
    ADD COLUMN issued_on date,
    ADD CONSTRAINT crm_invoice_drafts_invoice_no_check CHECK (((invoice_no IS NULL) OR (char_length(invoice_no) BETWEEN 1 AND 40))),
    ADD CONSTRAINT crm_invoice_drafts_provider_ref_check CHECK (((provider_ref IS NULL) OR (char_length(provider_ref) BETWEEN 1 AND 200))),
    ADD CONSTRAINT crm_invoice_drafts_issued_check CHECK (((invoice_no IS NULL) = (issued_on IS NULL))),
    ADD CONSTRAINT crm_invoice_drafts_state_check CHECK (((state = 'draft'::text AND invoice_no IS NULL) OR (state = 'issued'::text AND invoice_no IS NOT NULL)));
CREATE UNIQUE INDEX crm_invoice_drafts_invoice_no_key ON public.crm_invoice_drafts USING btree (workspace_id, invoice_no) WHERE (invoice_no IS NOT NULL);

-- The foreign key column added above leads an index too.
create index if not exists crm_invoice_drafts_crm_purchase_id_idx on public.crm_invoice_drafts (crm_purchase_id);

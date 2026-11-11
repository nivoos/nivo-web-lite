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
    customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
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

CREATE INDEX crm_contacts_customer ON public.crm_contacts USING btree (workspace_id, customer_id);

-- A website of a customer, keyed by its domain (lower case); one domain carries up to three services (domain, hosting, SSL) and a build.
CREATE TABLE public.crm_websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    domain text NOT NULL,
    customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
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

CREATE INDEX crm_websites_customer ON public.crm_websites USING btree (workspace_id, customer_id);

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
    customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    website_id uuid REFERENCES public.crm_websites(id) ON DELETE SET NULL,
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
    CONSTRAINT crm_services_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expiring'::text, 'expired'::text, 'suspended'::text, 'cancelled'::text, 'trial'::text, 'internal'::text, 'private_hosting'::text, 'not_found'::text, 'expiry_unknown'::text, 'unknown'::text]))),
    CONSTRAINT crm_services_expiry_source_check CHECK ((expiry_source = ANY (ARRAY['provider'::text, 'estimated'::text, 'invoice'::text, 'confirmed'::text, 'none'::text]))),
    CONSTRAINT crm_services_expiry_check CHECK (((expires_on IS NULL) = (expiry_source = 'none'::text))),
    CONSTRAINT crm_services_source_row_check CHECK ((source_row >= 0)),
    CONSTRAINT crm_services_source_hash_check CHECK ((char_length(source_hash) = 64))
);

-- The renewal list: services by end date.
CREATE INDEX crm_services_expires ON public.crm_services USING btree (workspace_id, expires_on) WHERE (expires_on IS NOT NULL);

-- A customer's services.
CREATE INDEX crm_services_customer ON public.crm_services USING btree (workspace_id, customer_id);

-- One reminder sent about a service (written by the renewal flow, P3): the channel and the message reference, never the words.
CREATE TABLE public.crm_service_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
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

CREATE INDEX crm_service_reminders_service ON public.crm_service_reminders USING btree (workspace_id, service_id, sent_at DESC);

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
    service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES public.crm_provider_accounts(id) ON DELETE CASCADE,
    external_id text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_provider_links_service_key UNIQUE (workspace_id, service_id)
);

-- One renewal asked of a provider plugin. The `manual` plugin records `pending_person` (a person renews at the provider and confirms);

-- `request_key` is the caller's replay key, so a repeated call answers the same row and never asks twice.
CREATE TABLE public.crm_renewal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    provider text NOT NULL,
    term_months integer NOT NULL,
    state text NOT NULL,
    dry_run boolean NOT NULL,
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
    plugin text,
    execute_key text,
    execute_hash text,
    executed_at timestamptz,
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
    CONSTRAINT crm_renewal_requests_plugin_check CHECK (((plugin IS NULL) OR (plugin = ANY (ARRAY['manual'::text, 'fixture'::text])))),
    CONSTRAINT crm_renewal_requests_execute_key_check CHECK (((execute_key IS NULL) OR (char_length(execute_key) BETWEEN 1 AND 200))),
    CONSTRAINT crm_renewal_requests_hash_check CHECK ((((request_hash IS NULL) OR (char_length(request_hash) = 64)) AND ((execute_hash IS NULL) OR (char_length(execute_hash) = 64)))),
    CONSTRAINT crm_renewal_requests_outcome_note_check CHECK (((outcome_note IS NULL) OR (char_length(outcome_note) <= 1000))),
    CONSTRAINT crm_renewal_requests_paid_check CHECK (((state = ANY (ARRAY['awaiting_payment'::text, 'cancelled'::text])) OR (transaction_ref IS NOT NULL) OR (payment_code IS NULL)))
);

CREATE INDEX crm_renewal_requests_service ON public.crm_renewal_requests USING btree (workspace_id, service_id, created_at DESC);

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

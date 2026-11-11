-- nivo-web-lite CRM (reminder keys, contact keys, notices, payments, payable notes, tickets, invoice drafts): converted from the holding project's 0001..0005 (never applied anywhere), 2026-11-12.
-- Tables live in schema public with the crm_ prefix; updated_at is set by private.set_updated_at() of the baseline.

CREATE UNIQUE INDEX crm_service_reminders_request_key ON public.crm_service_reminders USING btree (workspace_id, request_key) WHERE (request_key IS NOT NULL);

-- A contact is linked once per customer and address: the link operation upserts on these.
CREATE UNIQUE INDEX crm_contacts_zalo_key ON public.crm_contacts USING btree (workspace_id, customer_id, zalo_id) WHERE (zalo_id IS NOT NULL);

CREATE UNIQUE INDEX crm_contacts_email_key ON public.crm_contacts USING btree (workspace_id, customer_id, email) WHERE (email IS NOT NULL);

CREATE UNIQUE INDEX crm_contacts_phone_key ON public.crm_contacts USING btree (workspace_id, customer_id, phone) WHERE (phone IS NOT NULL);

CREATE UNIQUE INDEX crm_renewal_requests_payment_code_key ON public.crm_renewal_requests USING btree (workspace_id, payment_code) WHERE (payment_code IS NOT NULL);

CREATE UNIQUE INDEX crm_renewal_requests_transaction_ref_key ON public.crm_renewal_requests USING btree (workspace_id, transaction_ref) WHERE (transaction_ref IS NOT NULL);

CREATE UNIQUE INDEX crm_renewal_requests_execute_key_key ON public.crm_renewal_requests USING btree (workspace_id, execute_key) WHERE (execute_key IS NOT NULL);

-- The open requests list (awaiting payment, paid, waiting for a person).
CREATE INDEX crm_renewal_requests_open ON public.crm_renewal_requests USING btree (workspace_id, created_at, id) WHERE (state = ANY (ARRAY['awaiting_payment'::text, 'paid'::text, 'pending_person'::text]));

-- A notice sent about a real receivable (a project's collection): the channel and the message reference, never the words.
CREATE TABLE public.crm_receivable_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    receivable_id uuid NOT NULL REFERENCES public.crm_receivables(id) ON DELETE CASCADE,
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

CREATE INDEX crm_receivable_notices_receivable ON public.crm_receivable_notices USING btree (workspace_id, receivable_id, sent_at DESC);

-- A payment recorded against a real receivable: the bank row's reference only. The imported amounts are not changed by it (the books stay
-- the authority on collected / remaining until the next import).
CREATE TABLE public.crm_receivable_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    receivable_id uuid NOT NULL REFERENCES public.crm_receivables(id) ON DELETE CASCADE,
    transaction_ref text NOT NULL,
    recorded_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_receivable_payments_transaction_ref_key UNIQUE (workspace_id, transaction_ref),
    CONSTRAINT crm_receivable_payments_transaction_ref_check CHECK ((char_length(transaction_ref) BETWEEN 1 AND 200))
);

CREATE INDEX crm_receivable_payments_receivable ON public.crm_receivable_payments USING btree (workspace_id, receivable_id);

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

-- A support ticket: opened by the desk flow from a conversation or a mail, worked by people. customer_id is null when the sender is not
-- a known customer yet. service_ids are the services it concerns (same workspace).
CREATE TABLE public.crm_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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

CREATE INDEX crm_tickets_customer ON public.crm_tickets USING btree (workspace_id, customer_id) WHERE (customer_id IS NOT NULL);

-- A note or a status change on a ticket, by the person or agent named in `author`.
CREATE TABLE public.crm_ticket_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    ticket_id uuid NOT NULL REFERENCES public.crm_tickets(id) ON DELETE CASCADE,
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

CREATE INDEX crm_ticket_notes_ticket ON public.crm_ticket_notes USING btree (workspace_id, ticket_id, created_at);

-- The invoice draft of one renewal: lines and amounts computed by the CRM from the renewal (data only; issuing is a later provider).
CREATE TABLE public.crm_invoice_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    renewal_id uuid NOT NULL REFERENCES public.crm_renewal_requests(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    lines jsonb NOT NULL,
    net_vnd bigint NOT NULL,
    vat_rate_percent integer NOT NULL,
    vat_vnd bigint NOT NULL,
    total_vnd bigint NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    price_source text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_invoice_drafts_renewal_key UNIQUE (workspace_id, renewal_id),
    CONSTRAINT crm_invoice_drafts_lines_check CHECK (((jsonb_typeof(lines) = 'array'::text) AND (jsonb_array_length(lines) BETWEEN 1 AND 20))),
    CONSTRAINT crm_invoice_drafts_money_check CHECK (((net_vnd >= 0) AND (vat_vnd >= 0) AND (total_vnd = (net_vnd + vat_vnd)))),
    CONSTRAINT crm_invoice_drafts_vat_check CHECK ((vat_rate_percent BETWEEN 0 AND 100)),
    CONSTRAINT crm_invoice_drafts_state_check CHECK ((state = 'draft'::text)),
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

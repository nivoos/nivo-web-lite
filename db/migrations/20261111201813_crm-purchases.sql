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
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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
    purchase_id uuid NOT NULL REFERENCES public.crm_purchases(id) ON DELETE CASCADE,
    day date NOT NULL,
    channel text NOT NULL,
    outcome text NOT NULL,
    message_ref text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT crm_purchase_followups_day_key UNIQUE (workspace_id, purchase_id, day),
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
    ALTER COLUMN renewal_id DROP NOT NULL,
    ADD COLUMN purchase_id uuid REFERENCES public.crm_purchases(id) ON DELETE CASCADE,
    ADD CONSTRAINT crm_invoice_drafts_subject_check CHECK (((renewal_id IS NULL) <> (purchase_id IS NULL)));
CREATE UNIQUE INDEX crm_invoice_drafts_purchase_key ON public.crm_invoice_drafts USING btree (workspace_id, purchase_id) WHERE (purchase_id IS NOT NULL);

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


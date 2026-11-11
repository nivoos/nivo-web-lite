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
    customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    website_id uuid REFERENCES public.crm_websites(id) ON DELETE SET NULL,
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

CREATE INDEX crm_projects_customer ON public.crm_projects USING btree (workspace_id, customer_id);

-- One contract of the register, keyed by its number as written. The partner is free text; `customer_id` is set only when the partner
-- matches a customer's tax id or exact name.
CREATE TABLE public.crm_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    contract_no text NOT NULL,
    kind text NOT NULL,
    partner_name text,
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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

CREATE INDEX crm_contracts_customer ON public.crm_contracts USING btree (workspace_id, customer_id) WHERE (customer_id IS NOT NULL);

-- One VAT invoice the enterprise issued (in MISA), keyed by its number (`000000NN`): the total of its ledger lines (revenue + VAT) when the
-- TK131 ledger books it, and the stored PDF when a customer folder holds it.
CREATE TABLE public.crm_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    invoice_no text NOT NULL,
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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

CREATE INDEX crm_invoices_customer ON public.crm_invoices USING btree (workspace_id, customer_id, issued_on DESC) WHERE (customer_id IS NOT NULL);

-- One real receivable of a project in progress (the collection list), keyed by its project code. `due_on` is not in the source today.
CREATE TABLE public.crm_receivables (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    project_code text NOT NULL,
    project_id uuid REFERENCES public.crm_projects(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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

CREATE INDEX crm_ledger_balances_customer ON public.crm_ledger_balances USING btree (workspace_id, customer_id) WHERE (customer_id IS NOT NULL);

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
    customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
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

CREATE INDEX crm_documents_customer ON public.crm_documents USING btree (workspace_id, customer_id, kind) WHERE (customer_id IS NOT NULL);

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
    import_run_id uuid NOT NULL REFERENCES public.crm_import_runs(id) ON DELETE CASCADE,
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

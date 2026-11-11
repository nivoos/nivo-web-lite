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

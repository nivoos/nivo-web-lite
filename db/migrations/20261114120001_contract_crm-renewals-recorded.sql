-- Owner ruling R57 (2026-11-14): the CRM is pure storage. The Renewal agent renews at the provider through its own provider account
-- and records the provider's answer (`renewal.outcome.record`); the CRM's own provider step (`service.renewal.create`, plugins
-- manual / fixture, dry run) is deleted, so its columns go: no application code names them. A contract step: it drops columns,
-- their checks and an index.
DROP INDEX public.crm_renewal_requests_execute_key_key;
ALTER TABLE public.crm_renewal_requests
    DROP CONSTRAINT crm_renewal_requests_plugin_check,
    DROP CONSTRAINT crm_renewal_requests_execute_key_check,
    DROP CONSTRAINT crm_renewal_requests_hash_check,
    ADD CONSTRAINT crm_renewal_requests_hash_check CHECK (((request_hash IS NULL) OR (char_length(request_hash) = 64))),
    ADD CONSTRAINT crm_renewal_requests_provider_ref_check CHECK (((provider_ref IS NULL) OR (char_length(provider_ref) BETWEEN 1 AND 200))),
    DROP COLUMN dry_run,
    DROP COLUMN plugin,
    DROP COLUMN execute_key,
    DROP COLUMN execute_hash,
    DROP COLUMN executed_at;

-- An invoice draft is `draft` until the e-invoice issued for it is recorded (`issued`, with its number); the state check is replaced.
ALTER TABLE public.crm_invoice_drafts
    DROP CONSTRAINT crm_invoice_drafts_state_check,
    ADD CONSTRAINT crm_invoice_drafts_state_check CHECK (((state = 'draft'::text AND invoice_no IS NULL) OR (state = 'issued'::text AND invoice_no IS NOT NULL)));

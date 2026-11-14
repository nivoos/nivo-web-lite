-- An invoice draft RECORDS the e-invoice issued for it (owner ruling R57, 2026-11-14: the Accounting agent issues the invoice at
-- MISA meInvoice and writes the result into the CRM, which issues nothing): its number (unique in the workspace), the provider's
-- reference and the issue date. A draft holds all three or none of number and date.
ALTER TABLE public.crm_invoice_drafts
    ADD COLUMN invoice_no text,
    ADD COLUMN provider_ref text,
    ADD COLUMN issued_on date,
    ADD CONSTRAINT crm_invoice_drafts_invoice_no_check CHECK (((invoice_no IS NULL) OR (char_length(invoice_no) BETWEEN 1 AND 40))),
    ADD CONSTRAINT crm_invoice_drafts_provider_ref_check CHECK (((provider_ref IS NULL) OR (char_length(provider_ref) BETWEEN 1 AND 200))),
    ADD CONSTRAINT crm_invoice_drafts_issued_check CHECK (((invoice_no IS NULL) = (issued_on IS NULL)));
CREATE UNIQUE INDEX crm_invoice_drafts_invoice_no_key ON public.crm_invoice_drafts USING btree (workspace_id, invoice_no) WHERE (invoice_no IS NOT NULL);

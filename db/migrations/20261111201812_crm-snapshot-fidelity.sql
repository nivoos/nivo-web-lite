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

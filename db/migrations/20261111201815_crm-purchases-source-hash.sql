-- A purchase and a follow-up imported from the data repository keep the sha256 of their item, so a second import of the same
-- snapshot finds them unchanged (as every other imported table does); a purchase the CRM opened itself has none.
ALTER TABLE public.crm_purchases
    ADD COLUMN source_hash text,
    ADD CONSTRAINT crm_purchases_source_hash_check CHECK (((source_hash IS NULL) OR (char_length(source_hash) = 64)));

ALTER TABLE public.crm_purchase_followups
    ADD COLUMN source_hash text,
    ADD CONSTRAINT crm_purchase_followups_source_hash_check CHECK (((source_hash IS NULL) OR (char_length(source_hash) = 64)));

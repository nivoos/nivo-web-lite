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

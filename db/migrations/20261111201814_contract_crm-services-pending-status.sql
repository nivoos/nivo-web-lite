-- A service an accepted purchase opens is `pending`: ordered, not yet active (a person activates it at delivery).
-- The status check is replaced by a wider one (every earlier status stays allowed); a contract step because it drops
-- the old check, which no application code names.
ALTER TABLE public.crm_services
    DROP CONSTRAINT crm_services_status_check,
    ADD CONSTRAINT crm_services_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expiring'::text, 'expired'::text, 'suspended'::text, 'cancelled'::text, 'trial'::text, 'internal'::text, 'private_hosting'::text, 'not_found'::text, 'expiry_unknown'::text, 'unknown'::text, 'pending'::text])));

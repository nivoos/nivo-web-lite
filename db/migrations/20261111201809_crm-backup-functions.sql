-- The table-shaped backup of the CRM (format nivo-web-lite-data@2): three functions the backup service calls through
-- callDbFunction, because an entity cannot express a generic, column-for-column copy (ids, workspace ids and the two
-- database-set timestamps included). Each refuses a table outside the fixed list before any dynamic statement is built,
-- quotes the name with format('%I'), and runs as the caller (SECURITY INVOKER), so app_be's grants and row policies apply.

-- The CRM tables a backup copies, in restore order (a table after every table it references).
CREATE FUNCTION public.crm_backup_tables()
    RETURNS TABLE(table_name text)
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select t from unnest(array[
    'crm_customers', 'crm_contacts', 'crm_websites', 'crm_services', 'crm_service_reminders', 'crm_provider_accounts',
    'crm_provider_links', 'crm_renewal_requests', 'crm_projects', 'crm_contracts', 'crm_invoices', 'crm_receivables',
    'crm_ledger_balances', 'crm_documents', 'crm_import_runs', 'crm_import_issues', 'crm_import_changes',
    'crm_receivable_notices', 'crm_receivable_payments', 'crm_payable_notes', 'crm_tickets', 'crm_ticket_notes',
    'crm_invoice_drafts'
  ]) with ordinality as listed(t, position) order by position;
$$;

-- Refuses a table that is not a CRM backup table.
CREATE FUNCTION public.crm_backup_assert_table(p_table text)
    RETURNS void
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  if not exists (select 1 from public.crm_backup_tables() as listed where listed.table_name = p_table) then
    raise exception 'crm backup: unknown table %', p_table using errcode = '42P01';
  end if;
end;
$$;

-- One page of a table as JSON rows (every column, column names as stored), ordered by id, after p_after (null: from the start).
CREATE FUNCTION public.crm_backup_page(p_table text, p_after uuid, p_limit integer)
    RETURNS TABLE(row_data jsonb)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  perform public.crm_backup_assert_table(p_table);
  return query execute format(
    'select to_jsonb(t) from public.%I as t where $1 is null or t.id > $1 order by t.id limit $2', p_table
  ) using p_after, p_limit;
end;
$$;

-- The number of rows of a table.
CREATE FUNCTION public.crm_backup_count(p_table text)
    RETURNS TABLE(row_count bigint)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
begin
  perform public.crm_backup_assert_table(p_table);
  return query execute format('select count(*) from public.%I', p_table);
end;
$$;

-- Inserts JSON rows into a table exactly as a page answered them (ids and timestamps kept); answers the rows inserted.
CREATE FUNCTION public.crm_backup_insert(p_table text, p_rows jsonb)
    RETURNS TABLE(inserted bigint)
    LANGUAGE plpgsql VOLATILE
    SET search_path TO ''
    AS $$
declare
  v_count bigint;
begin
  perform public.crm_backup_assert_table(p_table);
  execute format(
    'insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I, $1)', p_table
  ) using p_rows;
  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.crm_backup_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_tables() TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_assert_table(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_assert_table(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_page(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_page(text, uuid, integer) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_count(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_count(text) TO app_be;
REVOKE EXECUTE ON FUNCTION public.crm_backup_insert(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_backup_insert(text, jsonb) TO app_be;

# Conventions

The naming and shape rules every table, column, migration, API field, error class and stored path of nivo-web-lite follows. Owner rule: one
way to write each thing; a name says exactly what it points at. When code and this page disagree, the code is wrong.

## Database

- Table: plural `snake_case` noun of the domain (`customers`, `tickets`, `services`).
- Primary key of a new table: `id uuid primary key default gen_random_uuid()`; a natural key is a `unique` constraint beside it.
- Foreign key column: the referenced table's singular name + `_id` (`customer_id` references `customers`); a reference whose role matters is
  `<role>_<table singular>_id`. Every foreign key column has an index named `<table>_<column>_idx` unless it leads a composite unique or primary index.
- Constraint and index names: `<table>_pkey`, `<table>_<columns>_key`, `<table>_<columns>_idx`, `<table>_<column>_fkey`, `<table>_<rule>_check`.
- Migration file: `db/migrations/<yyyymmddhhmmss>_<kebab-slug>.sql`, strictly increasing. Applied migrations are immutable: a later change is a new, additive
  forward migration; a destructive one is named `<stamp>_contract_<slug>.sql`.
- The one baseline `20261118180000_baseline.sql` (the owner's clean reset of 2026-11-18, `hfs.json` `db.baselineReset`) follows these rules; two package-owned tables keep a natural primary key (`db.keyExceptions`), and `identity_refresh_tokens.session_id` keeps the name of the managed auth entity.

## API and errors

- REST paths are `/v1/<plural noun>`; JSON fields are `camelCase`.
- A refusal the CRM declares carries a stable `code` (`CRM_<THING>_<REASON>`) in its error body; the NIVO Web package maps it to a declared refusal (`customer_not_found`).
- Back-end modules follow the harness canon: `platform` for infrastructure, `integrations/<provider>` for a third-party library, `domain` for the business.

## Package `packages/nivo-web`

- One class per cell; Zod at every boundary; cell keys `nivo-web.<name>`; the CRM provider is `nivoweb-crm`.
- A cell holds business steps only: no throw of a plain error, no refusal returned as data, no retry or clock (the engine owns them). A declared refusal is thrown
  (`if (error) throw error`) and routed by the step's `onRefused`.
- The seed under `packages/nivo-web/seed` is the output of `npm run build -w nivo-web` and is committed as built.

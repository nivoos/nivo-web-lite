# nivo-web-lite

One StarCi lite app of the sides be, packages.

## Overview

One StarCi lite app with no front end (fe): `hfs.json` declares its sides (`sides`), and `.starcistacks/application-stacks.yaml` states the same ones.

## Stack

TypeScript everywhere: NestJS in `be/` serving REST with an OpenAPI 3 document (@nestjs/swagger), TypeScript workspace packages in `packages/`, PostgreSQL with SQL migrations in `db/`; npm workspaces and Turbo for the workspace tasks.

## Repository layout

- `be/`: the Nest back end, its api app in `be/apps/api`, serving REST controllers described by the committed OpenAPI document `be/contracts/api/openapi.json` (`npm run contract:emit` writes it).
- `packages/`: the root workspace packages, `packages/nivo-web-lite-shared` first, built with `npm run build:modules`.
- `db/`: the SQL migrations, the schema authority of the database.

## Development

```sh
npm install
npm run contract:emit
npm run typecheck
npm run lint
npm test
npm run build:be
```

## Work

Work records live in `.starciwork/`; `.starciwork/workspace.yaml` supplies the project id and the repository roles the Work tools read.

## CRM backup

`cli backup export --out <dir>` writes the table-shaped backup (format `nivo-web-lite-data@2`): `tables/<table>.json` per CRM
table (every column, ids, workspace ids and the database-set timestamps included, rows ordered by id, canonical JSON) and
`manifest.json` (counts and the sha256 of each file, no row). A table whose rows did not change keeps its earlier `exportedAt`,
so an unchanged backup gives no diff. `cli backup restore --from <dir>` fills an EMPTY database: every file is verified
(sha256, canonical text, count, the set of tables) before anything is written, then all rows are inserted in one transaction and
recounted; any mismatch rolls everything back. Rows move through the database functions `public.crm_backup_*`
(`db/migrations/20261111201809_crm-backup-functions.sql`, listed in `hfs.json` `sides.be.dbFunctions`): R334 keeps SQL text out
of TypeScript, an entity cannot copy every column with the database-set timestamps, and `sqlPassThrough` is only for text that
is not the app's own. The commands print nothing but log the counts. Document binaries are NOT in this backup: the `documents`
rows carry the storage key and the sha256, and the object storage is backed up by its own means.

## CRM service credentials: many workspaces, one CRM

Every CRM row is keyed by `workspace_id`, and every call acts for exactly one workspace: the workspace of the service credential
that authenticated it. There is no workspace header and no environment variable naming a workspace. The operator issues one
credential per enterprise workspace (or more, one per NIVO connection) with
`cli credential issue --workspace <uuid> --label <text>`: the bearer `<id>.<secret>` is printed ONCE on standard output (never
logged); only the sha256 of the secret is stored in `public.crm_service_credentials`. NIVO's OpenAPI provider presents it as
`Authorization: Bearer <id>.<secret>`; the CRM looks the id up among the live credentials, compares the sha256 in constant time and
scopes every query of the call to that credential's workspace. `cli credential revoke --id <uuid>` revokes one; it is refused from
then on. The unit specs prove the scope over all 29 operations: each service spec runs its operations for the credentials of two
workspaces and checks that every statement names only the caller's workspace (`src/tests/fixtures/builders/workspace-scope.builder.ts`).

## CRM first load: the sealed data repository, format @1

The first load of a workspace's CRM (and every later refresh) comes from the sealed data repository `nivo-web-lite-data`,
format `nivo-web-lite-data@1` (its `FORMAT.md`), and from nothing else: no source spreadsheet is parsed here and no word list
decides a meaning. The owner decrypts a snapshot to a plaintext directory (`tools/restore.mjs` of that repository, or an in-memory
`sops --decrypt`), then runs `cli import snapshot --from <dir> --workspace <uuid>`: dry by default, it checks the whole snapshot
(the manifest of format @1, each file's sha256, schema id and count, every item's fields and closed value sets) and logs the
counts per entity of what would be inserted, updated and left unchanged. `--execute` writes in one transaction: every row is bound
to the workspace given (the format carries no id and no workspace), references resolve by natural key (customer code, domain,
project code), an item whose content hash is unchanged is not written again, and an item absent from the snapshot is never
deleted. A required reference to a customer the snapshot does not hold refuses the whole import. The specs use synthetic @1
fixtures only; the data repository's content is never read by them. The holding importer of the source folder stays parked
outside the project: its status word map is not brought in.

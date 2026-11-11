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

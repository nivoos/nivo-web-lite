# nivo-web

The NIVO Web workspace of the nivoos platform, authored with the nivoos SDK: the workspace "NIVO Web", the agent Hỗ trợ (`nivo-web.webdesk`, front door on Zalo OA), the brain
documents, the Zalo OA account `zalo-main`, and the business's own provider `nivoweb-crm` that reaches this repository's CRM service (`be/`, REST `/v1`, `be/contracts/api/openapi.json`).
The platform holds no business logic: each business is its own repository, and this package is NIVO Web's.

## Layout

- `src/nivo-web.package.ts` the package entry (`nivoos package build` writes the seed document into `seed/`, committed).
- `src/agents/<agent>/...` agents, their workflows, steps and cells (one class per file).
- `src/crm/` the `nivoweb-crm` provider (account fields `baseUrl`, `serviceKey`; bearer service credential) and its operations: `summary.counts` (connect test), `customers.find|get|services|contracts`,
  `tickets.create|get|list|update` (the writes carry the act's intent key as `Idempotency-Key`). The other CRM operations follow with the agent slices that call them (PLAN S4 to S9).
- `src/accounts/` `zalo-main` (platform catalogue provider `zalo`) and `crm-sandbox` (provider `nivoweb-crm`).
- `src/brain/` the public and internal brain documents.
- `dev/deploy.mjs` deploys it into the nivoos dev workspace.

## CRM: sandbox first

The agent is bound to `crm-sandbox` only: this repository's CRM api in dev (`http://127.0.0.1:3701`, `CRM_SANDBOX_URL` at deploy) with invented records, never real customers. A production account
(`crm-main`) is added when the owner switches the agents over. The service key is the one `cli credential issue --workspace <uuid> --label nivo-sandbox` prints once; set it as
`CRM_SANDBOX_SERVICE_KEY` of the dev custody member `nivo-web` (the deploy reads it through `starci app secret get --to-file`) (without it the account holds a placeholder and the CRM answers 401 until a deploy carries the key).

## Install

A standard business repository package (see the nivoos CLI README): `@starci/nivoos-sdk`, `@starci/nivoos-provider-templates` and `zod` are pinned dependencies; `@starci/nivoos-cli`, `typescript` and `@types/node` are pinned devDependencies; `"type": "module"`; a `nivoos.instances` block.
This folder is a root workspace: `npm ci` at the root installs the three `@starci/nivoos-*` packages from npm. Then, from the root:

```sh
npm run typecheck -w nivo-web
npm run build -w nivo-web      # writes the seed document into seed/
npm run check -w nivo-web      # the committed seed is the one build writes, byte for byte
```

The seed is the CLI output as written and is not run through Prettier.

## Deploy into the dev workspace

With the nivoos-lite dev stack up (`starci app stack up --env dev --execute` in `D:/Repositories/nivoos-lite`) and this repository next to it:

```sh
cd D:/Repositories/nivo-web-lite
node packages/nivo-web/dev/deploy.mjs --web https://nivo-app-dev.starci.org    # [--api ...] [--nivoos-lite <path>]
```

It signs the seeded owner in, deploys the platform's provider catalogue (master key), then this package with the owner key, and prints no secret. The CLI and the provider catalogue are the installed `@starci/nivoos-*` packages (no link to a nivoos-lite checkout; only the dev secret custody is read from it, `--nivoos-lite <path>`). When the instance already holds a newer catalogue than the published one, the catalogue step is skipped with a notice. A changed cell, graph or agent needs its version raised: the instance refuses changed content under a version it holds (`CELLS_VERSION_IMMUTABLE`). The Zalo OA values come from the nivoos-lite dev
custody member `nivo-web` (generated; the real OA is connected in the console). Safe to run twice.

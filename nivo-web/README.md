# nivo-web

The NIVO Web workspace of the nivoos platform, authored with the nivoos SDK: the workspace "NIVO Web", the agent Hỗ trợ (`nivo-web.webdesk`, front door on Zalo OA), the brain
documents, the Zalo OA account `zalo-main`, and the business's own provider `nivoweb-crm` that reaches this repository's CRM service (`be/`, REST `/v1`, `be/contracts/api/openapi.json`).
It moved here from `nivoos-lite/packages/nivo-web` with its history: the platform holds no business logic, each business is its own repository.

## Layout

- `src/nivo-web.package.ts` the package entry (`nivoos package build` writes `seed/nivo-web@<version>.json`, committed).
- `src/agents/<agent>/...` agents, their workflows, steps and cells (one class per file).
- `src/crm/` the `nivoweb-crm` provider (account fields `baseUrl`, `serviceKey`; bearer service credential) and its operations: `summary.counts` (connect test), `customers.find|get|services|contracts`,
  `tickets.create|get|list|update` (the writes carry the act's intent key as `Idempotency-Key`). The other CRM operations follow with the agent slices that call them (PLAN S4 to S9).
- `src/accounts/` `zalo-main` (platform catalogue provider `zalo`) and `crm-sandbox` (provider `nivoweb-crm`).
- `src/brain/` the public and internal brain documents.
- `dev/deploy.mjs` deploys it into the nivoos dev workspace.

## CRM: sandbox first

The agent is bound to `crm-sandbox` only: this repository's CRM api in dev (`http://127.0.0.1:3201`, `CRM_SANDBOX_URL` at deploy) with invented records, never real customers. A production account
(`crm-main`) is added when the owner switches the agents over. The service key is the one `cli credential issue --workspace <uuid> --label nivo-sandbox` prints once; set it as
`CRM_SANDBOX_SERVICE_KEY` in the shell that runs the deploy (without it the account holds a placeholder and the CRM answers 401 until a deploy carries the key).

## TEMPORARY: the nivoos SDK and CLI come from a sibling checkout

`@nivoos-lite/nivoos-sdk`, `@nivoos-lite/provider-templates` and `nivoos` (the CLI) are not published yet (lane `sdk-external` makes them consumable). Until then `package.json` links them with
`file:../../nivoos-lite/packages/...`, so `D:/Repositories/nivoos-lite` (built: `npm run build -w @nivoos-lite/nivoos-sdk && npm run build -w nivoos` there) must sit next to this repository.
Because of that this folder is NOT a root npm workspace (a `file:` link to a sibling would break `npm ci` in CI); it installs on its own. It sits at the repository root, not under `packages/`: the root lint, format and coverage gates are the canon of this NestJS service and judge `packages/*`, while an SDK-authored package follows the nivoos SDK conventions (default export of the package entry, Vietnamese text in source, one class per cell), which the canon refuses:

```sh
cd nivo-web
npm install        # links the sibling checkout
npm run typecheck
npm run build      # writes seed/nivo-web@<version>.json
```

TODO(sdk-external): when the SDK, the provider templates and the CLI are published, replace the three `file:` links by the published versions, consider moving the folder to `packages/nivo-web` once the canon can judge an SDK-authored package,
and delete this section and the `--nivoos-lite` option of `dev/deploy.mjs`.

## Deploy into the dev workspace

With the nivoos-lite dev stack up (`starci app stack up --env dev --execute` in `D:/Repositories/nivoos-lite`) and this repository next to it:

```sh
cd D:/Repositories/nivo-web-lite
node nivo-web/dev/deploy.mjs --web https://nivo-app-dev.starci.org    # [--api ...] [--nivoos-lite <path>]
```

It signs the seeded owner in, deploys the platform's provider catalogue (master key), then this package with the owner key, and prints no secret. The Zalo OA values come from the nivoos-lite dev
custody member `nivo-web` (generated; the real OA is connected in the console). Safe to run twice.

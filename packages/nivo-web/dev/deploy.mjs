// The NIVO Web dev world, deployed as an author deploys: through the real doors, with the real secrets of the harness secret store. NIVO Web lives in THIS repository
// (nivo-web-lite); the platform it deploys into (the dev stack, the provider catalogue, the nivoos CLI and SDK) is the nivoos-lite checkout. Run it once the nivoos-lite dev stack is up
// (`starci app stack up --env dev --execute` in nivoos-lite):
//
//   node packages/nivo-web/dev/deploy.mjs [--api http://localhost:3501] [--web http://localhost:3500] [--nivoos-lite D:/Repositories/nivoos-lite]
//
// What it does:
//   1. signs the seeded owner in (the email of the seat and `seed/SEED_MEMBER_PASSWORD`) and issues the owner an API key in the home workspace (POST /api-keys);
//   2. deploys the platform's provider catalogue with the instance master key (`master/NIVOOS_MASTER_API_KEY`; unchanged when already deployed) from the nivoos-lite checkout, then the nivo-web
//      package (from this repository) with the owner key, through `nivoos package deploy`: the package's Workspace class makes "NIVO Web" under its derived id (the owner owns it), with the
//      Support agent, the brain, the Zalo OA account `zalo-main` and the sandbox CRM account `crm-sandbox` (provider `nivoweb-crm`, carried by the package). `zalo-main` takes the dev custody
//      values `nivo-web/ZALO_MAIN_OA_SECRET_KEY` and `nivo-web/ZALO_MAIN_ACCESS_TOKEN` of the nivoos-lite dev custody (generated dev values: the real OA is connected by the owner in the
//      console). `crm-sandbox` points at `CRM_SANDBOX_URL` (default http://127.0.0.1:3701, this repository's CRM api) with the service key `nivo-web/CRM_SANDBOX_SERVICE_KEY` of the nivoos-lite dev custody (sealed from the issuance output with `starci app secret`, never printed)
//      (`cli credential issue --workspace <uuid> --label nivo-sandbox`); without it the account is made with an unissued placeholder and the CRM refuses its calls until a deploy carries the key.
// It posts no chat. Every secret is read through `starci app secret get --to-file` and passed on; no value is printed. Safe to run twice.
import { spawnSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
/** This repository (nivo-web-lite). */
const ROOT = resolve(HERE, "../../..")
const STARCI = process.env.STARCI_CLI ?? "D:/.claude/cli/dist/main.js"
const argValue = (name, fallback) => {
    const at = process.argv.indexOf(name)
    return at >= 0 ? process.argv[at + 1] : fallback
}
/** The platform checkout: its dev stack, custody and provider catalogue (TEMPORARY: a sibling checkout until the nivoos SDK and CLI are published). */
const NIVOOS_LITE = resolve(argValue("--nivoos-lite", process.env.NIVOOS_LITE_ROOT ?? resolve(ROOT, "../nivoos-lite")))
const API = argValue("--api", process.env.API_URL ?? "http://localhost:3501").replace(/\/$/u, "")
const WEB_ORIGIN = argValue("--web", process.env.WEB_URL ?? "http://localhost:3500")
/** The seeded home workspace the owner key is issued in; the shop's own workspace is the one the deploy makes. */
const HOME_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000"
const OWNER_EMAIL = "owner@seed.example.test"

const say = (line) => process.stdout.write(`${line}\n`)
const fail = (line) => {
    process.stderr.write(`${line}\n`)
    process.exit(1)
}

/** A dev custody value, read through the harness (never printed), or null when it is not sealed. */
const custodyOrNull = (member, key) => {
    const ran = spawnSync("node", [STARCI, "app", "secret", "get", "--env", "dev", member, key, "--to-file"], {
        cwd: NIVOOS_LITE,
        encoding: "utf8",
    })
    const line = `${ran.stdout ?? ""}\n${ran.stderr ?? ""}`
        .split(/\r?\n/u)
        .find((each) => each.startsWith(`${key}_FILE=`))
    return ran.status !== 0 || line === undefined ? null : readFileSync(line.slice(key.length + 6), "utf8").trim()
}

/** The same, refusing when the key is not sealed. */
const custody = (member, key) => {
    const value = custodyOrNull(member, key)
    if (value === null)
        fail(
            `dev custody ${member}/${key} is not readable: the owner arms \`starci app secret init --env dev --execute\` (it makes every key the stack declares) first`,
        )
    return value
}

const json = async (response) => {
    try {
        return await response.json()
    } catch {
        return null
    }
}

// ---- 1. the owner and the owner's API key ----------------------------------------------------------------------
const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: WEB_ORIGIN },
    body: JSON.stringify({ email: OWNER_EMAIL, password: custody("seed", "SEED_MEMBER_PASSWORD") }),
})
const grant = await json(login)
if (!login.ok || grant === null || typeof grant.accessToken !== "string")
    fail(`sign-in refused (${String(login.status)}): is the api up on ${API} and the seed applied?`)
const bearer = {
    origin: WEB_ORIGIN,
    authorization: `Bearer ${grant.accessToken}`,
    "x-workspace-id": HOME_WORKSPACE_ID,
    "content-type": "application/json",
}
const issued = await fetch(`${API}/api-keys`, {
    method: "POST",
    headers: bearer,
    body: JSON.stringify({
        name: `nivo-web dev ${new Date().toISOString().slice(0, 19).replace(/:/gu, "-")}`,
        scope: "owner",
    }),
})
const issuedBody = await json(issued)
const ownerKey = issuedBody?.key ?? issuedBody?.apiKey ?? issuedBody?.secret
if (!issued.ok || typeof ownerKey !== "string")
    fail(`the owner key was refused (${String(issued.status)}): ${JSON.stringify(issuedBody)}`)
say("issued an owner API key for the workspace")

// ---- 2. the deploys, through the CLI ---------------------------------------------------------------------------
// The CLI is the one this package depends on (TEMPORARY: a link to the nivoos-lite checkout; a published `nivoos` replaces it, see README.md).
const NIVOOS = resolve(HERE, "../node_modules/@starci/nivoos-cli/dist/main.js")
const CRM_SANDBOX_URL = process.env.CRM_SANDBOX_URL ?? "http://127.0.0.1:3701"
/** Until the operator issues the sandbox key the account holds this marker; the CRM refuses it (401) and a deploy that carries the real key rotates it. */
const CRM_KEY_PLACEHOLDER = "unissued.sandbox-key-not-issued-yet"
const crmKey = custodyOrNull("nivo-web", "CRM_SANDBOX_SERVICE_KEY")
if (crmKey === undefined || crmKey === "")
    say(
        "CRM_SANDBOX_SERVICE_KEY is not sealed in dev custody member nivo-web: the crm-sandbox account is made with a placeholder key (issue one with `cli credential issue --workspace <uuid> --label nivo-sandbox` in this repository and deploy again)",
    )

const deploy = (packageDir, entry, apiKey, secretsLines, publicFacts) => {
    const secretsFile = resolve(packageDir, "dev.secrets.env")
    writeFileSync(secretsFile, `${["# env: dev", ...secretsLines].join("\n")}\n`)
    try {
        const args = [NIVOOS, "package", "deploy", entry, "--env", "dev", "--secrets", secretsFile, "--url", API]
        if (publicFacts !== undefined) args.push("--public-json", JSON.stringify(publicFacts))
        const ran = spawnSync("node", args, {
            cwd: packageDir,
            encoding: "utf8",
            env: { ...process.env, NIVOOS_API_KEY: apiKey },
        })
        say(`${ran.stdout ?? ""}${ran.stderr ?? ""}`.trim())
        if (ran.status !== 0) fail(`deploy of ${packageDir} failed`)
    } finally {
        rmSync(secretsFile, { force: true })
    }
}
deploy(
    resolve(NIVOOS_LITE, "packages/provider-templates"),
    "src/provider-templates.package.ts",
    custody("master", "NIVOOS_MASTER_API_KEY"),
    [],
)
deploy(
    resolve(HERE, ".."),
    "src/nivo-web.package.ts",
    ownerKey,
    [
        `ZALO_MAIN_OA_SECRET_KEY=${custody("nivo-web", "ZALO_MAIN_OA_SECRET_KEY")}`,
        `ZALO_MAIN_ACCESS_TOKEN=${custody("nivo-web", "ZALO_MAIN_ACCESS_TOKEN")}`,
        `CRM_SANDBOX_SERVICE_KEY=${crmKey === undefined || crmKey === "" ? CRM_KEY_PLACEHOLDER : crmKey}`,
    ],
    { CRM_SANDBOX_URL },
)
say("deployed the provider catalogue and nivo-web; the NIVO Web workspace is in the owner's switcher")

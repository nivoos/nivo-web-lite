// The NIVO Web dev world, deployed as an author deploys: through the real doors, with the real secrets of the harness secret store. NIVO Web lives in THIS repository
// (nivo-web); it deploys with its own installed packages (@starci/nivoos-cli, @starci/nivoos-sdk and @starci/nivoos-provider-templates from npm); only the dev stack and its secret custody are the
// nivoos checkout's. Run it once the nivoos dev stack is up (`starci app stack up --env dev --execute` in nivoos):
//
//   node packages/nivo-web/dev/deploy.mjs [--env dev|staging] [--api http://localhost:3501] [--web http://localhost:3500] [--nivoos-lite D:/Repositories/nivoos] [--provider-templates <dir>]
//
// `--env staging` targets the nivoos staging instance (api https://api.nivo.staging.starci.org, web https://nivo.staging.starci.org; override with --api and --web). The owner is the staging
// owner the staging seed level makes (sealed member `staging/seeds-owner`: EMAIL and PASSWORD), the master key is `staging/master/NIVOOS_MASTER_API_KEY`, and the Zalo OA and CRM sandbox accounts
// carry unissued placeholders (staging holds no real OA and no CRM; the owner connects them in the console). The nivoos CLI runs with `--env dev`: its only other value, `prod`, is production,
// and staging is not.
//
// What it does:
//   1. signs the seeded owner in (the email of the seat and `seed/SEED_MEMBER_PASSWORD`) and issues the owner an API key in the home workspace (POST /api-keys);
//   2. deploys the platform's provider catalogue with the instance master key (`master/NIVOOS_MASTER_API_KEY`; unchanged when already deployed) from the nivoos checkout, then the nivo-web
//      package (from this repository) with the owner key, through `nivoos package deploy`: the package's Workspace class makes "NIVO Web" under its derived id (the owner owns it), with the
//      Support agent, the brain, the Zalo OA account `zalo-main` and the sandbox CRM account `crm-sandbox` (provider `nivoweb-crm`, carried by the package). `zalo-main` takes the dev custody
//      values `nivo-web/ZALO_MAIN_OA_SECRET_KEY` and `nivo-web/ZALO_MAIN_ACCESS_TOKEN` of the nivoos dev custody (generated dev values: the real OA is connected by the owner in the
//      console). `crm-sandbox` points at `CRM_SANDBOX_URL` (default http://127.0.0.1:3701, this repository's CRM api) with the service key `nivo-web/CRM_SANDBOX_SERVICE_KEY` of the nivoos dev custody (sealed from the issuance output with `starci app secret`, never printed)
//      (`cli credential issue --workspace <uuid> --label nivo-sandbox`); without it the account is made with an unissued placeholder and the CRM refuses its calls until a deploy carries the key.
// It posts no chat. Every secret is read through `starci app secret get --to-file` and passed on; no value is printed. Safe to run twice.
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
/** This repository (nivo-web). */
const ROOT = resolve(HERE, "../../..")
const argValue = (name, fallback) => {
    const at = process.argv.indexOf(name)
    return at >= 0 ? process.argv[at + 1] : fallback
}
/** The platform checkout, used ONLY for its dev secret custody (the harness secret store of the dev stack); no package, CLI or SDK is read from it. */
const nivoosLiteCandidates = [process.env.NIVOOS_LITE_ROOT, resolve(ROOT, "../nivoos"), "D:/Repositories/nivoos"].filter((each) => each !== undefined)
const NIVOOS_LITE = resolve(
    argValue("--nivoos-lite", nivoosLiteCandidates.find((each) => existsSync(resolve(each, "node_modules/starci-harness/dist/main.js"))) ?? nivoosLiteCandidates[0] ?? ""),
)
/** The harness CLI that custody is read through: the one the nivoos checkout installs (it matches that checkout's pin), never a global one. STARCI_CLI overrides it. */
const STARCI = process.env.STARCI_CLI ?? resolve(NIVOOS_LITE, "node_modules/starci-harness/dist/main.js")
if (!existsSync(STARCI)) {
    process.stderr.write(`the harness CLI ${STARCI} does not exist: pass --nivoos-lite <a nivoos checkout with npm ci run> or set STARCI_CLI
`)
    process.exit(1)
}
/** The world this run deploys into: `dev` (the local dev stack) or `staging` (the nivoos staging instance); it picks the custody environment, the owner and the URLs. */
const TARGET = argValue("--env", process.env.DEPLOY_ENV ?? "dev")
if (TARGET !== "dev" && TARGET !== "staging") {
    process.stderr.write(`--env ${TARGET}: use dev or staging\n`)
    process.exit(1)
}
const STAGING = TARGET === "staging"
const API = argValue("--api", process.env.API_URL ?? (STAGING ? "https://api.nivo.staging.starci.org" : "http://localhost:3501")).replace(/\/$/u, "")
const WEB_ORIGIN = argValue("--web", process.env.WEB_URL ?? (STAGING ? "https://nivo.staging.starci.org" : "http://localhost:3500"))
/** The seeded home workspace the owner key is issued in; the shop's own workspace is the one the deploy makes. */
const HOME_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000"
const DEV_OWNER_EMAIL = "owner@seed.example.test"

const say = (line) => process.stdout.write(`${line}\n`)
const fail = (line) => {
    process.stderr.write(`${line}\n`)
    process.exit(1)
}

/** A dev custody value, read through the harness (never printed), or null when it is not sealed. */
const custodyOrNull = (member, key) => {
    const ran = spawnSync("node", [STARCI, "app", "secret", "get", "--env", TARGET, member, key, "--to-file"], {
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
            STAGING
                ? `staging custody ${member}/${key} is not readable: the member is sealed in the nivoos checkout the staging seed level landed in (pass --nivoos-lite)`
                : `dev custody ${member}/${key} is not readable: the owner arms \`starci app secret init --env dev --execute\` (it makes every key the stack declares) first`,
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
    body: JSON.stringify(
        STAGING
            ? { email: custody("seeds-owner", "EMAIL"), password: custody("seeds-owner", "PASSWORD") }
            : { email: DEV_OWNER_EMAIL, password: custody("seed", "SEED_MEMBER_PASSWORD") },
    ),
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
        name: `nivo-web ${TARGET} ${new Date().toISOString().slice(0, 19).replace(/:/gu, "-")}`,
        scope: "owner",
    }),
})
const issuedBody = await json(issued)
const ownerKey = issuedBody?.key ?? issuedBody?.apiKey ?? issuedBody?.secret
if (!issued.ok || typeof ownerKey !== "string")
    fail(`the owner key was refused (${String(issued.status)}): ${JSON.stringify(issuedBody)}`)
say("issued an owner API key for the workspace")

// ---- 2. the deploys, through the CLI ---------------------------------------------------------------------------
// The CLI and the provider catalogue are the published ones this repository installs.
const nodeModules = (name) => {
    for (const base of [resolve(HERE, "../node_modules"), resolve(ROOT, "node_modules")]) {
        const found = resolve(base, name)
        if (existsSync(found)) return found
    }
    return fail(`${name} is not installed: run npm ci in this repository`)
}
const NIVOOS = resolve(nodeModules("@starci/nivoos-cli"), "dist/main.js")
/** The catalogue package this run deploys: the installed (published) one, or a checkout's `packages/provider-templates` when `--provider-templates <dir>` names it (a catalogue fix that is not published yet). */
const PROVIDER_TEMPLATES_INSTALLED = argValue("--provider-templates", undefined) === undefined ? nodeModules("@starci/nivoos-provider-templates") : resolve(argValue("--provider-templates", ""))
const CRM_SANDBOX_URL = process.env.CRM_SANDBOX_URL ?? "http://127.0.0.1:3701"
/** Until the operator issues the sandbox key the account holds this marker; the CRM refuses it (401) and a deploy that carries the real key rotates it. */
const CRM_KEY_PLACEHOLDER = "unissued.sandbox-key-not-issued-yet"
/** Staging holds no real Zalo OA: its account carries this marker until the owner connects the OA in the console. */
const ZALO_PLACEHOLDER = "unissued.zalo-oa-not-connected-yet"
const crmKey = STAGING ? null : custodyOrNull("nivo-web", "CRM_SANDBOX_SERVICE_KEY")
if (crmKey === null || crmKey === "")
    say(
        `CRM_SANDBOX_SERVICE_KEY is not sealed in ${TARGET} custody member nivo-web: the crm-sandbox account is made with a placeholder key (issue one with \`cli credential issue --workspace <uuid> --label nivo-sandbox\` in this repository and deploy again)`,
    )

/** Deploys one package; returns false (never exits) when `staleIsFine` and the instance only refused versions it already holds newer content under. */
const deploy = (packageDir, entry, apiKey, secretsLines, publicFacts, staleIsFine = false) => {
    const secretsDir = mkdtempSync(resolve(ROOT, ".tmp-deploy-secrets-"))
    const secretsFile = resolve(secretsDir, "dev.secrets.env")
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
        if (ran.status !== 0) {
            if (staleIsFine && `${ran.stdout}${ran.stderr}`.includes("CELLS_VERSION_IMMUTABLE")) return false
            rmSync(secretsDir, { recursive: true, force: true })
            fail(`deploy of ${packageDir} failed`)
        }
        return true
    } finally {
        rmSync(secretsDir, { recursive: true, force: true })
    }
}
// The instance may hold a catalogue newer than the published one (the platform deploys it from its own checkout); the immutability guard then refuses the older content, which is not a failure here.
const catalogueDeployed = deploy(
    PROVIDER_TEMPLATES_INSTALLED,
    "src/provider-templates.package.ts",
    custody("master", "NIVOOS_MASTER_API_KEY"),
    [],
    undefined,
    true,
)
if (!catalogueDeployed)
    say(
        "the instance holds a newer provider catalogue than the published @starci/nivoos-provider-templates: kept as it is, continuing with nivo-web",
    )
deploy(
    resolve(HERE, ".."),
    "src/nivo-web.package.ts",
    ownerKey,
    [
        `ZALO_MAIN_OA_SECRET_KEY=${STAGING ? ZALO_PLACEHOLDER : custody("nivo-web", "ZALO_MAIN_OA_SECRET_KEY")}`,
        `ZALO_MAIN_ACCESS_TOKEN=${STAGING ? ZALO_PLACEHOLDER : custody("nivo-web", "ZALO_MAIN_ACCESS_TOKEN")}`,
        `CRM_SANDBOX_SERVICE_KEY=${crmKey === null || crmKey === "" ? CRM_KEY_PLACEHOLDER : crmKey}`,
    ],
    { CRM_SANDBOX_URL },
)
say("deployed nivo-web; the NIVO Web workspace is in the owner's switcher")

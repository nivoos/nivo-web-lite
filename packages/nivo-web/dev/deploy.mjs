// The NIVO Web dev world, deployed as an author deploys: through the real doors, with the real secrets of the harness secret store. Run it once the dev
// stack is up (`starci app stack up --env dev --execute`), after packages/flower-shop/dev/deploy.mjs or alone:
//
//   node packages/nivo-web/dev/deploy.mjs [--api http://localhost:3501] [--web http://localhost:3500]
//
// What it does:
//   1. signs the seeded owner in (the email of the seat and `seed/SEED_MEMBER_PASSWORD`) and issues the owner an API key in the home workspace (POST /api-keys);
//   2. deploys the provider templates with the instance master key (`master/NIVOOS_MASTER_API_KEY`; unchanged when already deployed) and the nivo-web package with the
//      owner key, through `nivoos package deploy`: the package's Workspace class makes "NIVO Web" under its derived id (the owner owns it), with the Support agent
//      and the brain. The Zalo OA account `zalo-main` takes the dev custody values `nivo-web/ZALO_MAIN_OA_SECRET_KEY` and `nivo-web/ZALO_MAIN_ACCESS_TOKEN`
//      (generated dev values: the real OA is connected by the owner in the console, or deployed with the sealed values of the seed standard).
// It posts no chat. Every secret is read through `starci app secret get --to-file` and passed on; no value is printed. Safe to run twice.
import { spawnSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../../..")
const STARCI = process.env.STARCI_CLI ?? "D:/.claude/cli/dist/main.js"
const argValue = (name, fallback) => {
    const at = process.argv.indexOf(name)
    return at >= 0 ? process.argv[at + 1] : fallback
}
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

/** A dev custody value, read through the harness (never printed). */
const custody = (member, key) => {
    const ran = spawnSync("node", [STARCI, "app", "secret", "get", "--env", "dev", member, key, "--to-file"], { cwd: ROOT, encoding: "utf8" })
    const line = `${ran.stdout ?? ""}\n${ran.stderr ?? ""}`.split(/\r?\n/u).find((each) => each.startsWith(`${key}_FILE=`))
    if (ran.status !== 0 || line === undefined) fail(`dev custody ${member}/${key} is not readable: the owner arms \`starci app secret init --env dev --execute\` (it makes every key the stack declares) first`)
    return readFileSync(line.slice(key.length + 6), "utf8").trim()
}

const json = async (response) => {
    try {
        return await response.json()
    } catch {
        return null
    }
}

// ---- 1. the owner and the owner's API key ----------------------------------------------------------------------
const login = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: WEB_ORIGIN }, body: JSON.stringify({ email: OWNER_EMAIL, password: custody("seed", "SEED_MEMBER_PASSWORD") }) })
const grant = await json(login)
if (!login.ok || grant === null || typeof grant.accessToken !== "string") fail(`sign-in refused (${String(login.status)}): is the api up on ${API} and the seed applied?`)
const bearer = { origin: WEB_ORIGIN, authorization: `Bearer ${grant.accessToken}`, "x-workspace-id": HOME_WORKSPACE_ID, "content-type": "application/json" }
const issued = await fetch(`${API}/api-keys`, { method: "POST", headers: bearer, body: JSON.stringify({ name: `nivo-web dev ${new Date().toISOString().slice(0, 19).replace(/:/gu, "-")}`, scope: "owner" }) })
const issuedBody = await json(issued)
const ownerKey = issuedBody?.key ?? issuedBody?.apiKey ?? issuedBody?.secret
if (!issued.ok || typeof ownerKey !== "string") fail(`the owner key was refused (${String(issued.status)}): ${JSON.stringify(issuedBody)}`)
say("issued an owner API key for the workspace")

// ---- 2. the deploys, through the CLI ---------------------------------------------------------------------------
const NIVOOS = resolve(ROOT, "packages/nivoos-cli/dist/main.js")
const deploy = (packageDir, entry, apiKey, secretsLines) => {
    const secretsFile = resolve(ROOT, "packages", packageDir, "dev.secrets.env")
    writeFileSync(secretsFile, `${["# env: dev", ...secretsLines].join("\n")}\n`)
    try {
        const ran = spawnSync("node", [NIVOOS, "package", "deploy", entry, "--env", "dev", "--secrets", secretsFile, "--url", API], {
            cwd: resolve(ROOT, "packages", packageDir),
            encoding: "utf8",
            env: { ...process.env, NIVOOS_API_KEY: apiKey },
        })
        say(`${ran.stdout ?? ""}${ran.stderr ?? ""}`.trim())
        if (ran.status !== 0) fail(`deploy of ${packageDir} failed`)
    } finally {
        rmSync(secretsFile, { force: true })
    }
}
deploy("provider-templates", "src/provider-templates.package.ts", custody("master", "NIVOOS_MASTER_API_KEY"), [])
deploy("nivo-web", "src/nivo-web.package.ts", ownerKey, [`ZALO_MAIN_OA_SECRET_KEY=${custody("nivo-web", "ZALO_MAIN_OA_SECRET_KEY")}`, `ZALO_MAIN_ACCESS_TOKEN=${custody("nivo-web", "ZALO_MAIN_ACCESS_TOKEN")}`])
say("deployed provider-templates and nivo-web; the NIVO Web workspace is in the owner's switcher")

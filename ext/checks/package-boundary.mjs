#!/usr/bin/env node
// ext/manifest.json check `package-boundary` (doc ext/docs/checks/package-boundary.md): every business package of this repository holds business logic only
// (nivoos concept business-repos.md). The rule engine is not here: it ships with @starci/nivoos-cli (`checkPackages`, also `nivoos package boundary`); this file
// only finds the installed CLI, declares the package-specific parameters and prints. No arguments, no build; exit 1 on any error.
// Until the repository's @starci/nivoos-cli is a version that exports `checkPackages`, it says so and passes: bump the CLI to turn the check on.
import { existsSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The app root: ext/checks/../.. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

/** Package-specific parameters by package folder: `allow` (rule id -> globs where it does not apply), `exclude`, `disable`, `ratchet` (rule id -> errors still left). */
const PARAMETERS = {}

const packageFolders = existsSync(join(ROOT, "packages")) ? readdirSync(join(ROOT, "packages"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => join(ROOT, "packages", entry.name)) : []
const loadCli = () => {
    for (const folder of [ROOT, ...packageFolders]) {
        try {
            return createRequire(join(folder, "package.json"))("@starci/nivoos-cli")
        } catch {
            // not installed under this folder
        }
    }
    return undefined
}

const cli = loadCli()
if (cli === undefined || typeof cli.checkPackages !== "function") {
    console.log("package boundary: the installed @starci/nivoos-cli has no checkPackages yet; bump it to a version with the boundary engine to run this check")
    process.exit(0)
}
const packages = cli.discoverPackages(ROOT).map((pack) => ({ ...pack, ...(PARAMETERS[pack.name] ?? {}) }))
const report = cli.checkPackages({ root: ROOT, packages })
console.log(cli.formatReport(report, { verbose: process.argv.includes("--verbose") }))
process.exit(report.errors > 0 ? 1 : 0)

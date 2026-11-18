---
check: package-boundary
---

# Project check `package-boundary`

Program `ext/checks/package-boundary.mjs`: no arguments, no build, exit 0 is green. Run by the `checks` step of `starci app check` and `--gate hfs`.

A business package holds business logic only; retry, the clock, time zones, ids and codes, transport, counting, approval and refusals are the nivoos engine's (owner 2026-11-18).
The rule engine is shared and ships with `@starci/nivoos-cli` (`checkPackages`, also `nivoos package boundary`); this file only finds the installed CLI, declares the
package-specific parameters (`PARAMETERS`: `allow`, `exclude`, `disable`, `ratchet`) and prints. Each finding is `rule file:line message`, and the message names the engine capability to
use instead. A rule is an error once its capability is on nivoos dev and an info finding until then. Until the repository's `@starci/nivoos-cli` exports `checkPackages`, the check
says so and passes; bump the CLI to turn it on.

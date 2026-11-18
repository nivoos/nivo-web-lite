export { DataSeedModule } from "./seed.module"
export type { StoreIdentity } from "./seed.contracts"
export { inScopeOf, standardKeyFor, standardKeyOf, type StandardKey } from "./standard-key.policy"
// the one door to `@starci/seed` for the domain capabilities that serve a store of the data standard (BE-INFRA-3: a domain never imports the library itself)
export { importOutcome, recordEntry, recordValue, serveStore } from "@starci/seed"
export type { DataEntry, ImportOptions, ImportReport, RefusedKey, Selection, SetImport, StoreAdapter, StoreDescription } from "@starci/seed"

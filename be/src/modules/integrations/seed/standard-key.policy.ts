/**
 * The natural key of a seed-standard entry that lives in a workspace: `<workspace>/<name>`, the workspace by its `enterprise_key` (never an id: an id is not portable between
 * environments) and the name by what the entry is (a document key, a cell key). The name may hold more slashes. A key that is not of this form has no workspace.
 */
export interface StandardKey {
    readonly workspace: string
    readonly name: string
}

const WORKSPACE_KEY = /^[a-z][a-z0-9-]{0,39}$/u

/** The two parts of a natural key `<workspace>/<name>`, or null when the key is not of that form. */
export const standardKeyOf = (key: string): StandardKey | null => {
    const at = key.indexOf("/")
    if (at < 1 || at === key.length - 1) return null
    const workspace = key.slice(0, at)
    return WORKSPACE_KEY.test(workspace) ? { workspace, name: key.slice(at + 1) } : null
}

/** The natural key of a name of a workspace. */
export const standardKeyFor = (workspace: string, name: string): string => `${workspace}/${name}`

/** What an import of a selection narrowed to one workspace (`scope.workspace`) lets through. */
export const inScopeOf = (key: StandardKey, scope: Readonly<Record<string, string>> | undefined): boolean => scope?.["workspace"] === undefined || scope["workspace"] === key.workspace

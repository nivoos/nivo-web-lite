/** The package key: the ONE place it is written; every node, event kind and graph key of the package is `${PACKAGE_KEY}.<name>`. */
export const PACKAGE_KEY = "nivo-web"

/** The key of a node, an event kind or a graph of this package. */
export const keyOf = (name: string): string => `${PACKAGE_KEY}.${name}`

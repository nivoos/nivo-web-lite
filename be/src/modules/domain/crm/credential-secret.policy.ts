import { createHash, timingSafeEqual } from "node:crypto"

/** The bearer of a service credential: `<id>.<secret>`, the id a uuid, the secret 32 random bytes in base64url (43 characters). */
const BEARER = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/u

/** A presented bearer split into the credential id and its secret. */
export interface PresentedCredential {
    /** The credential id. */
    readonly id: string
    /** The secret part; only its sha256 is compared. */
    readonly secret: string
}

/** The hex sha256 of a secret, the only form the CRM stores. */
export const secretSha256Of = (secret: string): string => createHash("sha256").update(secret, "utf8").digest("hex")

/** The bearer token handed out once at issue. */
export const bearerOf = (id: string, secret: string): string => `${id}.${secret}`

/** The id and secret of `Authorization: Bearer <id>.<secret>` (scheme case-insensitive), or null for any other header. */
export const presentedOf = (authorization: string): PresentedCredential | null => {
    const [scheme, token, extra] = authorization.split(" ")
    if (scheme?.toLowerCase() !== "bearer" || token === undefined || extra !== undefined) return null
    const match = BEARER.exec(token)
    const id = match?.[1]
    const secret = match?.[2]
    return id === undefined || secret === undefined ? null : { id, secret }
}

/** Whether the secret's sha256 equals the stored one, compared in constant time over 32 bytes (BE-AUTH-3). */
export const sameSecret = (secret: string, storedSha256: string): boolean => {
    const stored = Buffer.from(storedSha256, "hex")
    const presented = Buffer.from(secretSha256Of(secret), "hex")
    return stored.length === presented.length && timingSafeEqual(stored, presented)
}

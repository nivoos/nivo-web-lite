import { createHash, timingSafeEqual } from "node:crypto"
import { Injectable } from "@nestjs/common"
import type { CredentialAuthenticator, CredentialMetadata, CredentialPrincipal } from "@modules/domain/identity"
import { InjectCrmOptions } from "./crm.decorators"
import type { CrmOptions } from "./crm.options"
import { CrmError, CrmErrorCode } from "./errors/crm.error"

/** The subject of the service key: the credential's NAME, never its value. */
const SUBJECT = "CRM_SERVICE_KEY"

/** True when two texts are equal, in time independent of where they differ (both hashed to 32 bytes first, BE-AUTH-3). */
const sameSecret = (presented: string, expected: string): boolean =>
    timingSafeEqual(createHash("sha256").update(presented).digest(), createHash("sha256").update(expected).digest())

@Injectable()
/**
 * The credential authenticator the app binds to identity (`IdentityModule.register({ credentialAuthenticator })`): a CRM door marked
 * `@Credential({ kind: "api-key" })` is admitted only with `Authorization: Bearer <CRM_SERVICE_KEY>`, compared in constant time, and
 * acts for the one workspace the key was issued for. The key is never logged or echoed.
 */
export class CrmCredentialService implements CredentialAuthenticator {
    constructor(@InjectCrmOptions() private readonly options: CrmOptions) {}

    /** Authenticates the service key of a CRM door. */
    authenticate(metadata: CredentialMetadata, authorization: string): Promise<CredentialPrincipal> {
        return Promise.resolve().then(() => this.principalOf(metadata, authorization))
    }

    /** The principal of a matching key; anything else is refused. */
    private principalOf(metadata: CredentialMetadata, authorization: string): CredentialPrincipal {
        const [scheme, key, extra] = authorization.split(" ")
        const presented = scheme?.toLowerCase() === "bearer" && extra === undefined ? key : undefined
        const credential = this.options.credential
        if (
            metadata.kind !== "api-key" ||
            !presented ||
            credential === undefined ||
            !sameSecret(presented, credential.serviceKey.reveal())
        ) {
            throw new CrmError({ code: CrmErrorCode.ServiceKeyRejected })
        }
        return { kind: "api-key", subject: SUBJECT, workspaceId: credential.workspaceId }
    }
}

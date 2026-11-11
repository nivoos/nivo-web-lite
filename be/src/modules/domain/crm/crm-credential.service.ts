import { Injectable } from "@nestjs/common"
import { IsNull, type EntityManager } from "typeorm"
import type { CredentialAuthenticator, CredentialMetadata, CredentialPrincipal } from "@modules/domain/identity"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { presentedOf, sameSecret, secretSha256Of } from "./credential-secret.policy"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { ServiceCredentialEntity } from "./persistence/entities"

/** A digest no presented secret is checked against for real: compared on a miss, so a miss costs the same compare as a wrong secret. */
const NO_CREDENTIAL = secretSha256Of("")

@Injectable()
/**
 * The credential authenticator the app binds to identity (`IdentityModule.register({ credentialAuthenticator })`): a CRM door marked
 * `@Credential({ kind: "api-key" })` is admitted only with `Authorization: Bearer <id>.<secret>` of a live (not revoked) service
 * credential, the secret's sha256 compared in constant time, and acts for that credential's one workspace. The secret is never
 * logged or echoed; the principal names the credential by id.
 */
export class CrmCredentialService implements CredentialAuthenticator {
    constructor(@InjectPrimaryEntityManager() private readonly entityManager: EntityManager) {}

    /** Authenticates the service credential of a CRM door. */
    async authenticate(metadata: CredentialMetadata, authorization: string): Promise<CredentialPrincipal> {
        const presented = metadata.kind === "api-key" ? presentedOf(authorization) : null
        const credential =
            presented === null
                ? null
                : await this.entityManager.findOne(ServiceCredentialEntity, {
                      where: { id: presented.id, revokedAt: IsNull() },
                  })
        const matches = sameSecret(presented?.secret ?? "", credential?.secretSha256 ?? NO_CREDENTIAL)
        if (credential === null || !matches) throw new CrmError({ code: CrmErrorCode.ServiceKeyRejected })
        return { kind: "api-key", subject: `crm-credential:${credential.id}`, workspaceId: credential.workspaceId }
    }
}

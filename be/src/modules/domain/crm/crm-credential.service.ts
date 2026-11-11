import { randomBytes } from "node:crypto"
import { Injectable } from "@nestjs/common"
import { IsNull, type EntityManager } from "typeorm"
import type { CredentialAuthenticator, CredentialMetadata, CredentialPrincipal } from "@modules/domain/identity"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { CredentialIssueInput } from "./credential.contracts"
import { bearerOf, presentedOf, sameSecret, secretSha256Of } from "./credential-secret.policy"
import { CrmCredentialLogEvent } from "./crm-credential.log-events"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { OperatorOutputClient } from "./operator-output.client"
import { ServiceCredentialEntity } from "./persistence/entities"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

/** The longest label. */
const LABEL_MAX = 120

/** A digest no presented secret is checked against for real: compared on a miss, so a miss costs the same compare as a wrong secret. */
const NO_CREDENTIAL = secretSha256Of("")

@Injectable()
/**
 * The service credentials of the CRM, one or more per enterprise workspace. As the credential authenticator the app binds to
 * identity (`IdentityModule.register({ credentialAuthenticator })`), it admits a CRM door marked `@Credential({ kind: "api-key" })`
 * only with `Authorization: Bearer <id>.<secret>` of a live credential, the secret's sha256 compared in constant time, acting for
 * that credential's one workspace. For the operator it issues a credential (only the sha256 of a fresh 32-byte secret is stored;
 * the bearer is shown ONCE, never logged) and revokes one (refused from then on). Logs carry ids and the workspace, never a secret.
 */
export class CrmCredentialService implements CredentialAuthenticator {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
        @InjectLogger() private readonly logger: Logger,
        private readonly output: OperatorOutputClient,
    ) {}

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

    /** Issues a credential for a workspace and shows its bearer once; answers its id. */
    async issue(input: CredentialIssueInput): Promise<string> {
        const workspaceId = input.workspaceId.toLowerCase()
        const label = input.label.trim()
        if (!UUID.test(workspaceId)) throw new CrmError({ code: CrmErrorCode.CredentialWorkspaceInvalid })
        if (label.length === 0 || label.length > LABEL_MAX) {
            throw new CrmError({ code: CrmErrorCode.CredentialLabelInvalid })
        }
        const id = this.ids.next()
        const secret = randomBytes(32).toString("base64url")
        await this.entityManager.insert(ServiceCredentialEntity, {
            id,
            workspaceId,
            label,
            secretSha256: secretSha256Of(secret),
            revokedAt: null,
        })
        this.logger.info(CrmCredentialLogEvent.Issued, { credentialId: id, workspaceId })
        this.output.show(bearerOf(id, secret))
        return id
    }

    /** Revokes a live credential; an unknown or already revoked id is refused. */
    async revoke(id: string): Promise<void> {
        const credentialId = id.toLowerCase()
        const result = await this.entityManager.update(
            ServiceCredentialEntity,
            { id: credentialId, revokedAt: IsNull() },
            { revokedAt: this.clock.now() },
        )
        if (result.affected !== 1) throw new CrmError({ code: CrmErrorCode.CredentialNotFound })
        this.logger.info(CrmCredentialLogEvent.Revoked, { credentialId })
    }
}

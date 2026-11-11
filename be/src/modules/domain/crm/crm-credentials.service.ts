import { randomBytes } from "node:crypto"
import { Injectable } from "@nestjs/common"
import { IsNull, type EntityManager } from "typeorm"
import { type Clock, InjectClock } from "@modules/platform/clock"
import { InjectPrimaryEntityManager } from "@modules/platform/database"
import { type Ids, InjectIds } from "@modules/platform/ids"
import { InjectLogger, type Logger } from "@modules/platform/logging"
import type { CredentialIssueInput } from "./credential.contracts"
import { bearerOf, secretSha256Of } from "./credential-secret.policy"
import { CrmCredentialLogEvent } from "./crm-credential.log-events"
import { CrmError, CrmErrorCode } from "./errors/crm.error"
import { OperatorOutputClient } from "./operator-output.client"
import { ServiceCredentialEntity } from "./persistence/entities"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

/** The longest label. */
const LABEL_MAX = 120

@Injectable()
/**
 * Issues and revokes the service credentials of the CRM, one or more per enterprise workspace. Issuing stores only the sha256
 * of a fresh 32-byte secret and shows the bearer `<id>.<secret>` ONCE to the operator (never logged); revoking stamps the
 * credential, after which it is refused. The log carries ids and the workspace, never a secret.
 */
export class CrmCredentialsService {
    constructor(
        @InjectPrimaryEntityManager() private readonly entityManager: EntityManager,
        @InjectClock() private readonly clock: Clock,
        @InjectIds() private readonly ids: Ids,
        @InjectLogger() private readonly logger: Logger,
        private readonly output: OperatorOutputClient,
    ) {}

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

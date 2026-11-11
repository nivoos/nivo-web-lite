import type { DynamicModule, Type } from "@nestjs/common"
import { IdentityModule } from "@modules/domain/identity"
import { CrmCredentialService, CrmModule } from "@modules/domain/crm"
import { LivenessModule } from "@modules/domain/liveness"
import type { VerifyAccessToken } from "@modules/integrations/passport"
import type { ApiOptions } from "../api.options"

/** The domain capabilities of the API, with the verifier of the app's own access tokens and the CRM's service-key authenticator. */
export const domainModules = (
    options: ApiOptions,
    verifyAccessToken: VerifyAccessToken,
): Array<Type<unknown> | DynamicModule> => [
    IdentityModule.register({ isGlobal: true, verifyAccessToken, credentialAuthenticator: CrmCredentialService }),
    CrmModule.register({ isGlobal: true, ...options.crm }),
    LivenessModule.register({ isGlobal: true }),
]

import { DocumentBuilder, type OpenAPIObject } from "@nestjs/swagger"

/**
 * The head of the api app's OpenAPI document: its title, version and bearer security scheme. main.ts serves the document over it,
 * and `starci app emit` adds the paths and schemas of the app's controllers and writes contracts/api/openapi.json (BE-TRANSPORT-4).
 */
export const OPENAPI: Omit<OpenAPIObject, "paths"> = new DocumentBuilder()
    .setTitle("nivo-web-lite")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addBearerAuth(
        {
            type: "http",
            scheme: "bearer",
            bearerFormat: "opaque",
            description:
                "A CRM service credential `<id>.<secret>`, issued per enterprise workspace by `cli credential issue` (the secret is shown once, only its sha256 is stored). The credential's workspace scopes every call; no header names a workspace. A revoked credential is refused.",
        },
        "serviceKey",
    )
    .build()

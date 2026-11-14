import { DocumentBuilder, type OpenAPIObject } from "@nestjs/swagger"

/**
 * The base path NIVO drops from an operation's name (`info["x-nivo-source"].basePath`; the document states no server, its paths
 * carry `/v1`): NIVO names `GET /v1/prices` of the CRM it pins as `nivoweb` `nivo.api.crm.nivoweb.get.prices`. The CRM id is chosen
 * when NIVO pins the document, never stated here; an operation outside `/v1` is no tool.
 */
const NIVO_SOURCE = { basePath: "/v1" } as const

/**
 * The head of the api app's OpenAPI document: its title, version, NIVO base path and bearer security scheme. main.ts serves the document over it,
 * and `starci app emit` adds the paths and schemas of the app's controllers and writes contracts/api/openapi.json (BE-TRANSPORT-4).
 */
export const OPENAPI: Omit<OpenAPIObject, "paths"> = new DocumentBuilder()
    .setTitle("nivo-web-lite")
    .setVersion("1.0.0")
    .addExtension("x-nivo-source", NIVO_SOURCE, "info")
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

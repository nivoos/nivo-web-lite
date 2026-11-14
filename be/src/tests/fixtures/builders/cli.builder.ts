import { Secret } from "@modules/platform/config"
import { PRIMARY_DATA_SOURCE } from "@modules/platform/database"
import { OBJECT_STORAGE } from "@modules/integrations/object-storage"

/** What a wiring proof hands the compiled root: public options and the infrastructure doubles. */
export interface WiringProof {
    readonly options: Readonly<Record<string, unknown>>
    readonly overrides: ReadonlyArray<{ readonly token: unknown; readonly value: unknown }>
}

/** Public fixture options and the database double for compiling the real CLI AppModule without network access. */
export const buildWiringProof = (): WiringProof => ({
    options: {
        connections: [
            {
                name: "primary",
                provider: "postgres",
                url: new Secret("postgresql://app_be@127.0.0.1:5432/postgres"),
                schema: "public",
            },
        ],
        objectStorage: {
            endpoint: "https://storage.fixture.example",
            region: "us-east-1",
            bucket: "fixture",
            accessKeyId: new Secret("fixture-only"),
            secretAccessKey: new Secret("fixture-only"),
            defaultExpiresIn: 300,
        },
    },
    overrides: [
        { token: PRIMARY_DATA_SOURCE, value: { manager: {} } },
        { token: OBJECT_STORAGE, value: {} },
    ],
})

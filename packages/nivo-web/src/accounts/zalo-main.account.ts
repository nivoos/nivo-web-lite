import { secret, type ProviderAccount } from "@starci/nivoos-sdk"
import { ZaloProvider } from "@starci/nivoos-provider-templates/zalo/zalo.provider.cell"

/**
 * The company's Zalo Official Account `zalo-main`, on the catalogue's `zalo` provider (provider-templates). Its OA secret key and access token are read from
 * `ZALO_MAIN_OA_SECRET_KEY` and `ZALO_MAIN_ACCESS_TOKEN` of the secrets file; its app id is the account's name unless the console sets the real one. The customer
 * line comes in on it and every reply goes out on it.
 */
export class ZaloMain implements ProviderAccount<typeof ZaloProvider> {
    readonly key = "zalo-main"
    readonly provider = ZaloProvider
    readonly title = { vi: "Zalo OA NIVO Web", en: "NIVO Web Zalo OA" }
    readonly fields = {}
    readonly secrets = { oaSecretKey: secret("ZALO_MAIN_OA_SECRET_KEY"), accessToken: secret("ZALO_MAIN_ACCESS_TOKEN") }
}

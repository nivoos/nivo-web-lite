import type { MessageBundle } from "@modules/platform/i18n"

/** Display text of the provider port codes, Vietnamese and English. */
export const RENEWAL_PROVIDER_MESSAGES: MessageBundle = {
    vi: {
        "errors.RENEWAL_PROVIDER_PLUGINS_INVALID": "{{key}} phải có dạng <nhà cung cấp>=<manual|fixture>,...",
    },
    en: {
        "errors.RENEWAL_PROVIDER_PLUGINS_INVALID": "{{key}} must read <provider>=<manual|fixture>,...",
    },
}

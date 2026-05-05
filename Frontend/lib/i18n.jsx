// Modulis inicializē lietotnes tulkojumus un izvēlas atbalstīto noklusējuma valodu.
// Tas apkopo angļu un latviešu tekstus, lai saskarni varētu pārslēgt atbilstoši lietotāja iestatījumiem.
import { I18n } from "i18n-js"

export const supportedLocales = ["en", "lv"]

export const normalizeLocale = (locale) => {
    const language = String(locale || "en").split("-")[0].toLowerCase()
    return supportedLocales.includes(language) ? language : "en"
}

const i18n = new I18n({
    en: require("./i18n/en.json"),
    lv: require("./i18n/lv.json"),
})

i18n.defaultLocale = "en"
i18n.locale = "en"
i18n.enableFallback = true

export const setI18nLocale = (locale) => {
    const nextLocale = normalizeLocale(locale)
    i18n.locale = nextLocale
    return nextLocale
}

export default i18n

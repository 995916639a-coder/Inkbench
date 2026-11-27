import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { english } from "./en";

export { useTranslation } from "react-i18next";

export type InterfaceLanguage = "zh-CN" | "en";
const preference = "inkbench.interfaceLanguage";

function preferredLanguage(): InterfaceLanguage {
  try {
    if (localStorage.getItem(preference) === "en") return "en";
  } catch { /* The renderer can still use its default language. */ }
  return "zh-CN";
}

void i18n.use(initReactI18next).init({
  lng: preferredLanguage(),
  supportedLngs: ["zh-CN", "en"],
  fallbackLng: "zh-CN",
  resources: { "zh-CN": { translation: {} }, en: { translation: english } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});
document.documentElement.lang = i18n.language;

export function interfaceText(key: string): string {
  return i18n.t(key);
}

export function setInterfaceLanguage(language: InterfaceLanguage): Promise<unknown> {
  return i18n.changeLanguage(language).then(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(preference, language);
    } catch { /* Use the chosen language for the current session. */ }
  });
}

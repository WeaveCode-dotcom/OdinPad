import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  "app.name": "OdinPad",
  "app.tagline": "Fiction writing workspace",
  "changelog.title": "What's new",
};

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

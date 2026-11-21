
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationAR from './locales/ar.json';

const resources = {
  en: {
    translation: translationEN
  },
  ar: {
    translation: translationAR
  }
};

const getSavedLanguage = () => {
  if (typeof window === "undefined") return "en";
  try {
    const savedLanguage = window.localStorage.getItem("app_lang");
    return savedLanguage === "ar" || savedLanguage === "en" ? savedLanguage : "en";
  } catch (error) {
    console.error("Failed to restore the saved language:", error);
    return "en";
  }
};

const applyDocumentLanguage = (language: string) => {
  if (typeof window === "undefined" || !document.documentElement) return;
  const languageCode = language.startsWith("ar") ? "ar" : "en";
  document.documentElement.dir = languageCode === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = languageCode;
  try {
    window.localStorage.setItem("app_lang", languageCode);
  } catch (error) {
    console.error("Failed to save the selected language:", error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  applyDocumentLanguage(lng);
});

applyDocumentLanguage(i18n.language || getSavedLanguage());

export default i18n;
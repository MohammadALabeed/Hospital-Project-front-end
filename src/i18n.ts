
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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', 
    fallbackLng: 'en', 
    interpolation: {
      escapeValue: false 
    }
  });

// Dynamic layout direction management based on selected language status
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined' && document.documentElement) {
    const direction = lng === 'ar' ? 'rtl' : 'ltr';
    
    // Applying direction metrics globally across document root nodes
    document.documentElement.dir = direction;
    if (document.body) {
      document.body.dir = direction;
    }
  }
});

export default i18n;
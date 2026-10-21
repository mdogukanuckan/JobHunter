import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import tr from './locales/tr.json';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// <html lang="..."> ekran okuyucular, tarayici ceviri onerisi ve CSS buyuk harf donusumu (tr'de "i" -> "İ") icin
// guncel tutulur. Dinleyici init()'ten ONCE kayit edilmeli: kaynaklar bellekte oldugu icin dil tespiti init sirasinda
// (senkron) biter ve "languageChanged" o an tetiklenir; sonradan kayit edilen dinleyici ilk dili hic gormez ve
// index.html'deki lang="tr" Ingilizce arayuzde de kalirdi.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Dil secimi: once localStorage'daki tercih, yoksa tarayici dili, o da desteklenmiyorsa Turkce.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true, // "en-US" -> "en"
    interpolation: { escapeValue: false }, // React zaten XSS'e karsi escape eder
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'jh_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;

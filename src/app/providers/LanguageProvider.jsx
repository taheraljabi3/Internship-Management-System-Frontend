import { createContext, useEffect, useMemo, useState } from 'react';

export const LanguageContext = createContext(null);
const LANGUAGE_STORAGE_KEY = 'ims_language';

function readInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'ar' || stored === 'en' ? stored : 'en';
  } catch (error) {
    console.error('Failed to read language preference.', error);
    return 'en';
  }
}

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to store language preference.', error);
    }

    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('ims-lang-ar', language === 'ar');
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'ar' ? 'en' : 'ar')),
      isArabic: language === 'ar',
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;

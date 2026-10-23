import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { translations, getTranslation } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'maison_parfum_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language: Language = 'fr';
  const isRTL = false;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'fr');
    } catch (e) {
      console.warn('Unable to persist language in localStorage', e);
    }
    document.documentElement.lang = 'fr';
    document.documentElement.dir = 'ltr';
  }, []);

  const setLanguage = (_lang: Language) => {
    // Single language: French only
  };

  const t = (key: keyof typeof translations): string => {
    return getTranslation(key, 'fr');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

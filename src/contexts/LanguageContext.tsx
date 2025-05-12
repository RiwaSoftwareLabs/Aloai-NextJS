"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enTranslations from '@/locales/en.json';
import arTranslations from '@/locales/ar.json';

type Language = 'en' | 'ar';
type Translations = typeof enTranslations;

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>(enTranslations);
  const isRTL = language === 'ar';

  useEffect(() => {
    // Set HTML dir attribute for RTL support
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Set translations based on language
    setTranslations(language === 'en' ? enTranslations : arTranslations);
  }, [language, isRTL]);

  const toggleLanguage = () => {
    setLanguage(prevLang => (prevLang === 'en' ? 'ar' : 'en'));
  };

  // Translation function that accepts dot notation
  const t = (key: string): string => {
    const keys = key.split('.');
    let result = translations as Record<string, unknown>;
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (result && typeof result === 'object' && k in result) {
        result = result[k] as Record<string, unknown>;
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return typeof result === 'string' ? result : key;
  };

  const value = {
    language,
    isRTL,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider; 
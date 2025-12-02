'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Supported languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr', flag: '🇨🇳' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  // Coming soon - easily expandable
  // de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  // ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
  // pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷' },
  // ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  // tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  // ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl', flag: '🇵🇰' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Cache for loaded translations
const translationCache: Record<string, any> = {};

interface I18nContextType {
  locale: LanguageCode;
  setLocale: (locale: LanguageCode) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  languages: typeof LANGUAGES;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Load translations dynamically
async function loadTranslations(locale: LanguageCode): Promise<any> {
  if (translationCache[locale]) {
    return translationCache[locale];
  }

  try {
    const translations = await import(`@/locales/${locale}.json`);
    translationCache[locale] = translations.default || translations;
    return translationCache[locale];
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
    // Fallback to English
    if (locale !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>('en');
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Detect browser language on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('bizra-locale') as LanguageCode;
    if (savedLocale && LANGUAGES[savedLocale]) {
      setLocaleState(savedLocale);
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language.split('-')[0] as LanguageCode;
      if (LANGUAGES[browserLang]) {
        setLocaleState(browserLang);
      }
    }
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    setIsLoading(true);
    loadTranslations(locale).then((data) => {
      setTranslations(data);
      setIsLoading(false);
      
      // Update document direction
      document.documentElement.dir = LANGUAGES[locale].dir;
      document.documentElement.lang = locale;
    });
  }, [locale]);

  const setLocale = useCallback((newLocale: LanguageCode) => {
    setLocaleState(newLocale);
    localStorage.setItem('bizra-locale', newLocale);
  }, []);

  // Translation function with parameter support
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let value = getNestedValue(translations, key) || key;
    
    // Replace parameters {{param}}
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([param, replacement]) => {
        value = value.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), replacement);
      });
    }
    
    return value;
  }, [translations]);

  const dir = LANGUAGES[locale].dir;
  const isRTL = dir === 'rtl';

  return (
    <I18nContext.Provider value={{
      locale,
      setLocale,
      t,
      dir,
      isRTL,
      languages: LANGUAGES,
      isLoading,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Hook for RTL-aware styling
export function useRTL() {
  const { isRTL, dir } = useI18n();
  
  return {
    isRTL,
    dir,
    // Utility classes for RTL
    textAlign: isRTL ? 'text-right' : 'text-left',
    marginStart: (size: string) => isRTL ? `mr-${size}` : `ml-${size}`,
    marginEnd: (size: string) => isRTL ? `ml-${size}` : `mr-${size}`,
    paddingStart: (size: string) => isRTL ? `pr-${size}` : `pl-${size}`,
    paddingEnd: (size: string) => isRTL ? `pl-${size}` : `pr-${size}`,
    flexRow: isRTL ? 'flex-row-reverse' : 'flex-row',
    // Transform for icons that should flip
    iconFlip: isRTL ? 'scale-x-[-1]' : '',
  };
}

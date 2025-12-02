'use client';

import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n, LANGUAGES, type LanguageCode } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  className?: string;
}

export function LanguageSelector({ variant = 'dropdown', className = '' }: LanguageSelectorProps) {
  const { locale, setLocale, languages, isRTL } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages[locale];

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-black/30 border border-[#D4AF37]/30
            hover:border-[#D4AF37]/60 hover:bg-black/50
            transition-all duration-300
            text-white/80 hover:text-[#D4AF37]
          `}
          title="Change language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{currentLang.flag}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`
                  absolute top-full mt-2 z-50
                  min-w-[160px] py-2
                  bg-black/90 backdrop-blur-xl
                  border border-[#D4AF37]/30 rounded-xl
                  shadow-xl shadow-black/50
                  ${isRTL ? 'right-0' : 'left-0'}
                `}
              >
                {(Object.entries(languages) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLocale(code);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2
                      transition-all duration-200
                      ${locale === code
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span>{lang.flag}</span>
                    <span className="text-sm">{lang.nativeName}</span>
                    {locale === code && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {(Object.entries(languages) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang]) => (
          <button
            key={code}
            onClick={() => setLocale(code)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              border transition-all duration-300
              ${locale === code
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                : 'bg-black/30 border-white/10 text-white/60 hover:border-[#D4AF37]/30 hover:text-white'
              }
            `}
          >
            <span>{lang.flag}</span>
            <span className="text-sm">{lang.nativeName}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-black/30 border border-[#D4AF37]/30
          hover:border-[#D4AF37]/60 hover:bg-black/50
          transition-all duration-300
          text-white/80 hover:text-white
          min-w-[140px]
        `}
      >
        <Globe className="w-4 h-4 text-[#D4AF37]" />
        <span className="flex-1 text-left">{currentLang.nativeName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`
                absolute top-full mt-2 z-50
                min-w-[180px] py-2
                bg-black/90 backdrop-blur-xl
                border border-[#D4AF37]/30 rounded-xl
                shadow-xl shadow-black/50
                ${isRTL ? 'right-0' : 'left-0'}
              `}
            >
              {(Object.entries(languages) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang]) => (
                <button
                  key={code}
                  onClick={() => {
                    setLocale(code);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5
                    transition-all duration-200
                    ${locale === code
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.nativeName}</span>
                  <span className="text-xs text-white/40">{lang.name}</span>
                  {locale === code && (
                    <Check className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </button>
              ))}
              
              {/* Coming Soon indicator */}
              <div className="mt-2 pt-2 border-t border-white/10 px-4 py-2">
                <p className="text-xs text-white/40 text-center">
                  More languages coming soon
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

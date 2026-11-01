import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import idDict from '../locales/id.json';
import enDict from '../locales/en.json';
import zhDict from '../locales/zh.json';
import {
  SupportedLanguage,
  initTranslationStorage,
  subscribeToTranslations,
  queueTextTranslation,
  getCachedTranslation,
  translateFullArticle,
  TranslatedArticlePayload,
} from '../services/translationService';

export type LanguageCode = SupportedLanguage;

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  shortLabel: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'id', label: 'Indonesia', shortLabel: 'ID', flag: '🇮🇩' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
  { code: 'zh', label: '中文 (Mandarin)', shortLabel: 'ZH', flag: '🇨🇳' },
];

const dictionaries: Record<LanguageCode, any> = {
  id: idDict,
  en: enDict,
  zh: zhDict,
};

interface LanguageContextType {
  lang: LanguageCode;
  languages: LanguageOption[];
  currentLanguage: LanguageOption;
  changeLanguage: (newLang: LanguageCode) => Promise<void>;
  t: (path: string, fallback?: string) => string;
  getArticleTitle: (article: any) => string;
  getArticleContent: (article: any) => string;
  getArticleExcerpt: (article: any) => string;
  getCategoryName: (slugOrName: string) => string;
  translateText: (text: string, defaultOverride?: string) => string;
  loadFullArticleTranslation: (article: any) => Promise<TranslatedArticlePayload | null>;
  isTranslating: boolean;
  version: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LanguageCode>('id');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [version, setVersion] = useState(0);

  // Load saved language on mount
  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang === 'id' || savedLang === 'en' || savedLang === 'zh') {
          setLang(savedLang as LanguageCode);
          await initTranslationStorage(savedLang as LanguageCode);
        }
      } catch (e) {
        console.error('Error loading language in native app:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLang();
  }, []);

  // Subscribe to background batch translations
  useEffect(() => {
    const unsubscribe = subscribeToTranslations(() => {
      setVersion(v => v + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const changeLanguage = async (newLang: LanguageCode) => {
    if (newLang === lang) return;
    setLang(newLang);
    setVersion(v => v + 1);

    try {
      await AsyncStorage.setItem('appLanguage', newLang);
      await initTranslationStorage(newLang);
    } catch (e) {
      console.error('Error saving language in native app:', e);
    }
  };

  const t = (path: string, fallback?: string): string => {
    if (!path) return fallback || '';
    const keys = path.split('.');
    let current: any = dictionaries[lang] || dictionaries.id;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Indonesian dictionary
        let idFallback: any = dictionaries.id;
        for (const k of keys) {
          if (idFallback && typeof idFallback === 'object' && k in idFallback) {
            idFallback = idFallback[k];
          } else {
            idFallback = null;
            break;
          }
        }
        return typeof idFallback === 'string' ? idFallback : (fallback || path);
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
  };

  // Helper cerdas ekstraksi Judul sesuai bahasa aktif (dengan auto-translation realtime)
  const getArticleTitle = (article: any): string => {
    if (!article) return '';
    const originalTitle = article.title || '';
    if (lang === 'id') return originalTitle;

    // 1. Static override in Firestore
    if (lang === 'en' && article.title_en) return article.title_en;
    if (lang === 'zh' && article.title_zh) return article.title_zh;

    // 2. Local cache lookup
    const cached = getCachedTranslation(originalTitle, lang);
    if (cached) return cached;

    // 3. Queue in background & return original text while translating
    queueTextTranslation(originalTitle, lang);
    return originalTitle;
  };

  // Helper cerdas ekstraksi Ringkasan/Excerpt sesuai bahasa aktif (dengan auto-translation realtime)
  const getArticleExcerpt = (article: any): string => {
    if (!article) return '';
    const originalExcerpt = article.excerpt || article.summary || article.seoDescription || article.description || '';
    if (lang === 'id') return originalExcerpt;

    // 1. Static override in Firestore
    if (lang === 'en' && (article.excerpt_en || article.seoDescription_en)) {
      return article.excerpt_en || article.seoDescription_en;
    }
    if (lang === 'zh' && (article.excerpt_zh || article.seoDescription_zh)) {
      return article.excerpt_zh || article.seoDescription_zh;
    }

    // 2. Local cache lookup
    const cached = getCachedTranslation(originalExcerpt, lang);
    if (cached) return cached;

    // 3. Queue in background
    queueTextTranslation(originalExcerpt, lang);
    return originalExcerpt;
  };

  // Helper cerdas ekstraksi Konten Isi Berita
  const getArticleContent = (article: any): string => {
    if (!article) return '';
    if (lang === 'id') return article.content || '';

    // Static override in Firestore
    if (lang === 'en' && article.content_en) return article.content_en;
    if (lang === 'zh' && article.content_zh) return article.content_zh;

    return article.content || '';
  };

  // Helper terjemahan teks umum on-demand
  const translateText = (text: string, defaultOverride?: string): string => {
    if (!text) return '';
    if (lang === 'id') return text;
    if (defaultOverride && typeof defaultOverride === 'string' && defaultOverride.trim()) {
      return defaultOverride.trim();
    }

    const cached = getCachedTranslation(text, lang);
    if (cached) return cached;

    queueTextTranslation(text, lang);
    return text;
  };

  // Helper load terjemahan artikel penuh (judul + ringkasan + isi HTML + keyPoints)
  const loadFullArticleTranslation = async (article: any): Promise<TranslatedArticlePayload | null> => {
    if (!article || !article.id || lang === 'id') return null;

    try {
      setIsTranslating(true);
      const result = await translateFullArticle(article, lang);
      return result;
    } catch (e) {
      console.warn('loadFullArticleTranslation failed:', e);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper terjemahan nama kategori
  const getCategoryName = (slugOrName: string): string => {
    if (!slugOrName) return '';
    const cleanSlug = slugOrName.toLowerCase().trim().replace(/\s+/g, '-');
    const translated = t(`categories.${cleanSlug}`);
    if (translated && translated !== `categories.${cleanSlug}`) {
      return translated;
    }
    return slugOrName;
  };

  const currentLanguage = AVAILABLE_LANGUAGES.find((l) => l.code === lang) || AVAILABLE_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        lang,
        languages: AVAILABLE_LANGUAGES,
        currentLanguage,
        changeLanguage,
        t,
        getArticleTitle,
        getArticleContent,
        getArticleExcerpt,
        getCategoryName,
        translateText,
        loadFullArticleTranslation,
        isTranslating,
        version,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import idDict from '../locales/id.json';
import enDict from '../locales/en.json';
import zhDict from '../locales/zh.json';

export type LanguageCode = 'id' | 'en' | 'zh';

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
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LanguageCode>('id');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang === 'id' || savedLang === 'en' || savedLang === 'zh') {
          setLang(savedLang);
        }
      } catch (e) {
        console.error('Error loading language in native app:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLang();
  }, []);

  const changeLanguage = async (newLang: LanguageCode) => {
    if (newLang === lang) return;
    setLang(newLang);
    try {
      await AsyncStorage.setItem('appLanguage', newLang);
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
        // Fallback ke dictionary id
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

  // Helper cerdas ekstraksi Judul sesuai bahasa aktif
  const getArticleTitle = (article: any): string => {
    if (!article) return '';
    if (lang === 'en' && article.title_en) return article.title_en;
    if (lang === 'zh' && article.title_zh) return article.title_zh;
    return article.title || '';
  };

  // Helper cerdas ekstraksi Konten Isi Berita sesuai bahasa aktif
  const getArticleContent = (article: any): string => {
    if (!article) return '';
    if (lang === 'en' && article.content_en) return article.content_en;
    if (lang === 'zh' && article.content_zh) return article.content_zh;
    return article.content || '';
  };

  // Helper cerdas ekstraksi Ringkasan/Excerpt sesuai bahasa aktif
  const getArticleExcerpt = (article: any): string => {
    if (!article) return '';
    if (lang === 'en') {
      return article.excerpt_en || article.seoDescription_en || article.excerpt || article.seoDescription || '';
    }
    if (lang === 'zh') {
      return article.excerpt_zh || article.seoDescription_zh || article.excerpt || article.seoDescription || '';
    }
    return article.excerpt || article.seoDescription || '';
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

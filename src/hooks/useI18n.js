'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import id from '../dictionaries/id.json';
import en from '../dictionaries/en.json';
import zh from '../dictionaries/zh.json';

const dictionaries = { id, en, zh };

export const AVAILABLE_LANGUAGES = [
  { code: 'id', label: 'ID - Indonesia', shortLabel: 'ID', flag: '🇮🇩' },
  { code: 'en', label: 'EN - English', shortLabel: 'EN', flag: '🇺🇸' },
  { code: 'zh', label: 'ZH - 中文', shortLabel: 'ZH', flag: '🇨🇳' },
];

const I18nContext = createContext({
  lang: 'id',
  t: (key) => key,
  changeLanguage: () => {},
  languages: AVAILABLE_LANGUAGES,
});

export const I18nProvider = ({ children, initialLang = 'id' }) => {
  const [lang, setLang] = useState(initialLang || 'id');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Cek dari cookie browser
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
      if (match && ['id', 'en', 'zh'].includes(match[2])) {
        setLang(match[2]);
        return;
      }
      try {
        const stored = localStorage.getItem('bedain_lang');
        if (stored && ['id', 'en', 'zh'].includes(stored)) {
          setLang(stored);
          return;
        }
      } catch (e) {}
    }
    // 2. Fallback ke initialLang dari server
    if (initialLang && ['id', 'en', 'zh'].includes(initialLang)) {
      setLang(initialLang);
    }
  }, [initialLang]);

  const changeLanguage = (newLang) => {
    if (!newLang || newLang === lang) return;
    setLang(newLang);

    // Simpan pilihan bahasa ke Cookie & LocalStorage (1 tahun)
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem('bedain_lang', newLang);
      } catch (e) {}
    }
  };

  const t = (key) => {
    if (typeof key !== 'string') return null;
    const keys = key.split('.');

    // Coba ambil dari kamus bahasa aktif
    const activeDict = dictionaries[lang] || dictionaries['id'];
    let value = activeDict;
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        value = null;
        break;
      }
    }

    // Jika belum ada di bahasa target (misal zh atau en), fallback ke id
    if (value === null && lang !== 'id') {
      let fallback = dictionaries['id'];
      for (const k of keys) {
        if (fallback && fallback[k] !== undefined) {
          fallback = fallback[k];
        } else {
          return null;
        }
      }
      return fallback;
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ lang, t, changeLanguage, languages: AVAILABLE_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

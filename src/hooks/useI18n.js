'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import id from '../dictionaries/id.json';
import en from '../dictionaries/en.json';
import zh from '../dictionaries/zh.json';

const dictionaries = { id, en, zh };

const I18nContext = createContext({
  lang: 'id',
  t: (key) => key,
  changeLanguage: () => {},
});

export const I18nProvider = ({ children, initialLang = 'id' }) => {
  const [lang, setLang] = useState(initialLang);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  const changeLanguage = (newLang) => {
    if (newLang === lang) return;
    
    // Construct new URL
    const currentPath = pathname;
    
    // Remove existing language prefix if any
    let newPath = currentPath;
    if (currentPath.startsWith('/en/')) newPath = currentPath.replace('/en/', '/');
    else if (currentPath === '/en') newPath = '/';
    else if (currentPath.startsWith('/zh/')) newPath = currentPath.replace('/zh/', '/');
    else if (currentPath === '/zh') newPath = '/';
    
    // Add new language prefix if not default 'id'
    if (newLang !== 'id') {
      newPath = `/${newLang}${newPath === '/' ? '' : newPath}`;
    }
    
    // Update cookie so the server remembers the preference
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
    // Force hard reload to ensure server-side rewrites and headers apply correctly
    window.location.href = newPath;
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = dictionaries[lang] || dictionaries['id'];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return value;
  };

  return (
    <I18nContext.Provider value={{ lang, t, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from './useI18n';

// In-memory cache shared across all components
const memoryCache = {
  zh: {},
  en: {},
};

// Queue for debounced batch translation
let pendingBatch = new Set();
let batchTimeout = null;
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const isValidTranslation = (original, translated, targetLang) => {
  if (!translated || typeof translated !== 'string') return false;
  const origTrim = (original || '').trim();
  const transTrim = translated.trim();
  if (!origTrim || !transTrim) return false;

  if (targetLang === 'zh') {
    // If original does not have Chinese, translation must contain Chinese and not match original
    if (!/[\u4e00-\u9fa5]/.test(origTrim)) {
      if (origTrim === transTrim || !/[\u4e00-\u9fa5]/.test(transTrim)) {
        return false;
      }
    }
  }

  if (targetLang === 'en') {
    // If original is long and identical to translated, it likely failed to translate
    if (origTrim.length > 15 && origTrim.toLowerCase() === transTrim.toLowerCase()) {
      return false;
    }
  }

  return true;
};

const translateSingleClientFallback = async (text, targetLang) => {
  try {
    const tl = targetLang === 'zh' ? 'zh-CN' : targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const trans = data[0]?.map((p) => p[0] || '').join('');
      if (isValidTranslation(text, trans, targetLang)) {
        return trans;
      }
    }
  } catch (e) {}

  // Secondary client fallback: MyMemory
  try {
    const tl = targetLang === 'zh' ? 'zh-CN' : targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=id|${tl}&de=redaksi@bedainnews.com`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText;
      if (isValidTranslation(text, trans, targetLang)) {
        return trans;
      }
    }
  } catch (e) {}

  return null;
};

const processBatch = async (targetLang) => {
  if (pendingBatch.size === 0 || targetLang === 'id') return;

  const textsToTranslate = Array.from(pendingBatch);
  pendingBatch.clear();

  if (!memoryCache[targetLang]) {
    memoryCache[targetLang] = {};
  }

  try {
    const res = await fetch('/api/translate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: textsToTranslate, targetLang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.translations)) {
        let hasNew = false;
        textsToTranslate.forEach((original, idx) => {
          const translated = data.translations[idx];
          if (translated && isValidTranslation(original, translated, targetLang)) {
            const cleanOrig = (original || '').trim();
            memoryCache[targetLang][original] = translated;
            if (cleanOrig) {
              memoryCache[targetLang][cleanOrig] = translated;
            }
            hasNew = true;
          }
        });
        if (hasNew) {
          notifyListeners();
        }
      }
    }
  } catch (err) {
    console.warn('Batch translate via server failed, using client fallback:', err);
  }

  // Client-side fallback for any items that failed or were missed
  const missingTexts = textsToTranslate.filter((t) => {
    const clean = (t || '').trim();
    const cached = memoryCache[targetLang]?.[t] || memoryCache[targetLang]?.[clean];
    return !cached || !isValidTranslation(clean, cached, targetLang);
  });

  if (missingTexts.length > 0) {
    await Promise.all(
      missingTexts.map(async (text) => {
        const fallbackTrans = await translateSingleClientFallback(text, targetLang);
        if (fallbackTrans) {
          const clean = (text || '').trim();
          memoryCache[targetLang][text] = fallbackTrans;
          if (clean) {
            memoryCache[targetLang][clean] = fallbackTrans;
          }
          notifyListeners();
        }
      })
    );
  }

  // Persist to localStorage
  try {
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem(`bedain_titles_${targetLang}`) || '{}');
      const merged = { ...existing, ...memoryCache[targetLang] };
      localStorage.setItem(`bedain_titles_${targetLang}`, JSON.stringify(merged));
    }
  } catch (e) {}

  notifyListeners();
};

export const useAutoTranslate = () => {
  const { lang } = useI18n();
  const [, setVersion] = useState(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Initialize memory cache from localStorage once and sanitize invalid entries
  useEffect(() => {
    if (typeof window !== 'undefined' && lang !== 'id') {
      try {
        const stored = localStorage.getItem(`bedain_titles_${lang}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const sanitized = {};
          let dirty = false;
          for (const [k, v] of Object.entries(parsed)) {
            if (isValidTranslation(k, v, lang)) {
              sanitized[k] = v;
            } else {
              dirty = true;
            }
          }
          if (dirty) {
            localStorage.setItem(`bedain_titles_${lang}`, JSON.stringify(sanitized));
          }
          memoryCache[lang] = { ...sanitized, ...(memoryCache[lang] || {}) };
          setVersion((v) => v + 1);
        }
      } catch (e) {}
    }
  }, [lang]);

  // Subscribe to batch translation updates
  useEffect(() => {
    const onUpdate = () => {
      setVersion((v) => v + 1);
    };
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  const queueTranslation = useCallback((text, targetLang) => {
    if (!text || targetLang === 'id') return;
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return;

    const cached = memoryCache[targetLang]?.[text] || memoryCache[targetLang]?.[cleanText];
    if (cached && isValidTranslation(cleanText, cached, targetLang)) return;

    pendingBatch.add(cleanText);

    // Jika batch sudah mencapai 6 item (misalnya 5 headline pertama), langsung proses tanpa tunggu
    if (pendingBatch.size >= 6) {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      processBatch(targetLang);
      return;
    }

    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(() => {
      processBatch(targetLang);
    }, 40);
  }, []);

  const translateText = useCallback(
    (text, defaultOverride) => {
      if (!text || typeof text !== 'string') return '';
      if (lang === 'id') return text;

      // 1. If explicit manual translation provided, use it
      if (defaultOverride && typeof defaultOverride === 'string' && defaultOverride.trim()) {
        return defaultOverride.trim();
      }

      const cleanText = text.trim();
      if (!cleanText) return text;

      // 2. Check memory cache or sync localStorage with validation
      const cached = memoryCache[lang]?.[text] || memoryCache[lang]?.[cleanText];
      if (cached && isValidTranslation(cleanText, cached, lang)) {
        return cached;
      }
      if (cached && !isValidTranslation(cleanText, cached, lang)) {
        delete memoryCache[lang][text];
        delete memoryCache[lang][cleanText];
      }

      if (typeof window !== 'undefined') {
        try {
          if (!memoryCache[lang] || Object.keys(memoryCache[lang]).length === 0) {
            const stored = localStorage.getItem(`bedain_titles_${lang}`);
            if (stored) {
              memoryCache[lang] = JSON.parse(stored);
            }
          }
          const storedVal = memoryCache[lang]?.[text] || memoryCache[lang]?.[cleanText];
          if (storedVal && isValidTranslation(cleanText, storedVal, lang)) {
            return storedVal;
          }
          if (storedVal && !isValidTranslation(cleanText, storedVal, lang)) {
            delete memoryCache[lang][text];
            delete memoryCache[lang][cleanText];
          }
        } catch (e) {}
      }

      // 3. Queue for translation and return original text as fallback
      queueTranslation(cleanText, lang);
      return text;
    },
    [lang, queueTranslation]
  );

  const translateArticleTitle = useCallback(
    (article) => {
      if (!article) return '';
      const originalTitle = article.title || '';
      if (lang === 'id') return originalTitle;

      const staticOverride = lang === 'zh' ? article.title_zh : (lang === 'en' ? article.title_en : null);
      return translateText(originalTitle, staticOverride);
    },
    [lang, translateText]
  );

  const translateArticleExcerpt = useCallback(
    (article) => {
      if (!article) return '';
      const originalExcerpt = article.excerpt || article.seoDescription || '';
      if (lang === 'id') return originalExcerpt;

      const staticOverride = lang === 'zh' 
        ? (article.excerpt_zh || article.seoDescription_zh) 
        : (lang === 'en' ? (article.excerpt_en || article.seoDescription_en) : null);
      return translateText(originalExcerpt, staticOverride);
    },
    [lang, translateText]
  );

  return {
    lang,
    translateText,
    translateArticleTitle,
    translateArticleExcerpt,
  };
};

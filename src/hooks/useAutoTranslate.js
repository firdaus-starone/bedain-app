'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from './useI18n';

// In-memory cache shared across all components
const memoryCache = {
  zh: {},
  en: {},
};

// Queue and lock controls
let pendingBatch = new Set();
let batchTimeout = null;
const inFlight = new Set();
const recentFailures = new Map();
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {}
  });
};

export const isValidTranslation = (original, translated, targetLang) => {
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

// Fast single client fallback using Google Translate (CORS friendly)
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

// Check memory cache or sync with localStorage
const getFromCache = (text, targetLang) => {
  if (!text || targetLang === 'id') return null;
  const clean = typeof text === 'string' ? text.trim() : '';
  if (!clean) return null;

  // 1. Direct in-memory check
  const mem = memoryCache[targetLang]?.[text] || memoryCache[targetLang]?.[clean];
  if (mem && isValidTranslation(clean, mem, targetLang)) {
    return mem;
  }

  // 2. Synchronize from localStorage if missing in memory
  if (typeof window !== 'undefined') {
    try {
      if (!memoryCache[targetLang]) {
        memoryCache[targetLang] = {};
      }
      const stored = localStorage.getItem(`bedain_titles_${targetLang}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(memoryCache[targetLang], parsed);
        const hit = memoryCache[targetLang][text] || memoryCache[targetLang][clean];
        if (hit && isValidTranslation(clean, hit, targetLang)) {
          return hit;
        }
      }
    } catch (e) {}
  }

  return null;
};

const processBatch = async (targetLang) => {
  if (pendingBatch.size === 0 || targetLang === 'id') return;

  const textsToTranslate = Array.from(pendingBatch);
  pendingBatch.clear();

  // Mark all as in-flight to prevent re-entry loops
  textsToTranslate.forEach((t) => inFlight.add(`${targetLang}:${t}`));

  if (!memoryCache[targetLang]) {
    memoryCache[targetLang] = {};
  }

  let hasNewTranslations = false;

  // 1. Try batch translation via server API
  try {
    const res = await fetch('/api/translate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: textsToTranslate, targetLang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.translations)) {
        textsToTranslate.forEach((original, idx) => {
          const translated = data.translations[idx];
          if (translated && isValidTranslation(original, translated, targetLang)) {
            const cleanOrig = (original || '').trim();
            memoryCache[targetLang][original] = translated;
            if (cleanOrig) {
              memoryCache[targetLang][cleanOrig] = translated;
            }
            hasNewTranslations = true;
          }
        });
      }
    }
  } catch (err) {
    console.warn('Batch translate via server failed, using client fallback:', err);
  }

  // 2. Immediately fall back on client for any untranslated or missing items
  const missingTexts = textsToTranslate.filter((t) => {
    const clean = (t || '').trim();
    const cached = memoryCache[targetLang]?.[t] || memoryCache[targetLang]?.[clean];
    return !cached || !isValidTranslation(clean, cached, targetLang);
  });

  if (missingTexts.length > 0) {
    await Promise.all(
      missingTexts.map(async (text) => {
        const clean = (text || '').trim();
        const fallbackTrans = await translateSingleClientFallback(clean, targetLang);
        if (fallbackTrans && isValidTranslation(clean, fallbackTrans, targetLang)) {
          memoryCache[targetLang][text] = fallbackTrans;
          if (clean) {
            memoryCache[targetLang][clean] = fallbackTrans;
          }
          hasNewTranslations = true;
        } else {
          recentFailures.set(`${targetLang}:${clean}`, Date.now());
        }
      })
    );
  }

  // Release in-flight markers
  textsToTranslate.forEach((t) => inFlight.delete(`${targetLang}:${t}`));

  // 3. Persist to localStorage & notify UI listeners
  if (hasNewTranslations && typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(localStorage.getItem(`bedain_titles_${targetLang}`) || '{}');
      const merged = { ...existing, ...memoryCache[targetLang] };
      localStorage.setItem(`bedain_titles_${targetLang}`, JSON.stringify(merged));
    } catch (e) {}
    notifyListeners();
  }
};

export const useAutoTranslate = () => {
  const { lang } = useI18n();
  const [, setVersion] = useState(0);

  // Initialize memory cache from localStorage on language change
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

    // Check if already in cache
    const cached = getFromCache(cleanText, targetLang);
    if (cached) return;

    // Check if already in flight or failed recently (within 30s)
    const reqKey = `${targetLang}:${cleanText}`;
    if (inFlight.has(reqKey)) return;
    const lastFail = recentFailures.get(reqKey);
    if (lastFail && Date.now() - lastFail < 30000) return;

    pendingBatch.add(cleanText);

    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(() => {
      processBatch(targetLang);
    }, 50);
  }, []);

  const translateText = useCallback(
    (text, defaultOverride) => {
      if (!text || typeof text !== 'string') return '';
      if (lang === 'id') return text;

      const cleanText = text.trim();
      if (!cleanText) return text;

      // 1. If explicit manual translation provided and VALID, use it
      if (defaultOverride && typeof defaultOverride === 'string') {
        const cleanOverride = defaultOverride.trim();
        if (cleanOverride && isValidTranslation(cleanText, cleanOverride, lang)) {
          return cleanOverride;
        }
      }

      // 2. Check cache (in-memory or localStorage)
      const cached = getFromCache(cleanText, lang);
      if (cached) {
        return cached;
      }

      // 3. Queue for background translation and return original text as temporary fallback
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
      const validOverride = (staticOverride && isValidTranslation(originalTitle, staticOverride, lang)) 
        ? staticOverride 
        : null;
      return translateText(originalTitle, validOverride);
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
      const validOverride = (staticOverride && isValidTranslation(originalExcerpt, staticOverride, lang)) 
        ? staticOverride 
        : null;
      return translateText(originalExcerpt, validOverride);
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

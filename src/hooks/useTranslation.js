"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const COUNTRY_TO_LANG_MAP = {
  MY: 'ms', BN: 'ms',
  US: 'en', GB: 'en', AU: 'en', SG: 'en', CA: 'en', NZ: 'en', IE: 'en', PH: 'en',
  SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', JO: 'ar', LB: 'ar', IQ: 'ar', OM: 'ar', YE: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar',
  CN: 'zh', TW: 'zh', HK: 'zh',
  JP: 'ja',
  KR: 'ko',
  NL: 'nl', BE: 'nl',
  FR: 'fr',
  DE: 'de', AT: 'de', CH: 'de',
  RU: 'ru',
  PT: 'pt', BR: 'pt',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es',
  IN: 'hi', BD: 'hi',
  TH: 'th',
  VN: 'vi'
};

const LANG_NAMES = {
  ms: 'Malay',
  en: 'English',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  pt: 'Portuguese',
  es: 'Spanish',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesia'
};

const LANG_CODE_MAP = {
  zh: 'zh-CN',
  en: 'en',
  id: 'id',
  ms: 'ms',
  ar: 'ar',
  ja: 'ja',
  ko: 'ko',
  nl: 'nl',
  fr: 'fr',
  de: 'de',
  ru: 'ru',
  pt: 'pt',
  es: 'es',
  hi: 'hi',
  th: 'th',
  vi: 'vi',
};

// Global in-memory cache to prevent duplicate fetches within the session
const memoryArticleCache = new Map();

/**
 * Synchronously retrieves cached translation if available in memory or localStorage
 */
export const getCachedArticleTranslation = (articleId, targetLang) => {
  if (!articleId || !targetLang || targetLang === 'id') return null;
  const cacheKey = `${articleId}_${targetLang}`;
  if (memoryArticleCache.has(cacheKey)) {
    return memoryArticleCache.get(cacheKey);
  }
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`bedain_art_trans_${cacheKey}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.title && parsed.content) {
          memoryArticleCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
};

/**
 * Direct client-side translation chunker fallback
 */
async function clientTranslateChunk(text, targetLang) {
  if (!text || !text.trim()) return text;
  const tl = LANG_CODE_MAP[targetLang] || targetLang;

  // 1. Google Translate Android API (CORS friendly Access-Control-Allow-Origin: *)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=at&dt=t&dj=1&sl=auto&tl=${tl}&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const trans = data.sentences?.map((s) => s.trans || '').join('');
      if (trans && trans.trim()) return trans;
    }
  } catch (e) {}

  // 2. MyMemory (CORS friendly Access-Control-Allow-Origin: *)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=id|${tl}&de=redaksi@bedainnews.com`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText;
      if (trans && !trans.includes('MYMEMORY WARNING')) return trans;
    }
  } catch (e) {}

  return text;
}

/**
 * Client-side HTML chunk translation preserving formatting & images
 */
async function clientTranslateHtml(html, targetLang) {
  if (!html || !html.trim()) return html;
  const parts = html.split(/(<\/(?:p|h[1-6]|blockquote|li|div)>)/i);
  const chunks = [];
  let currentChunk = '';

  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i] || '';
    const closingTag = parts[i + 1] || '';
    const block = content + closingTag;

    if (/^<p[^>]*>\s*<img[^>]*\/?>\s*<\/p>$/i.test(block.trim())) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      chunks.push(block);
      continue;
    }

    if (currentChunk.length + block.length > 1200 && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = block;
    } else {
      currentChunk += block;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      if (/^<p[^>]*>\s*<img[^>]*\/?>\s*<\/p>$/i.test(chunk.trim())) {
        return chunk;
      }
      return clientTranslateChunk(chunk, targetLang);
    })
  );

  return translatedChunks.join('');
}

export const useTranslation = (article, activeLanguage) => {
  const [translating, setTranslating] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState(() => {
    if (article?.id && activeLanguage && activeLanguage !== 'id') {
      return getCachedArticleTranslation(article.id, activeLanguage);
    }
    return null;
  });
  const [detectedLang, setDetectedLang] = useState('id');
  const [currentTargetLang, setCurrentTargetLang] = useState(activeLanguage || 'id');
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);

  // Sync currentTargetLang with activeLanguage from useI18n
  useEffect(() => {
    if (activeLanguage) {
      setCurrentTargetLang(activeLanguage);
      if (activeLanguage === 'id') {
        setTranslatedArticle(null);
      } else if (article?.id) {
        const cached = getCachedArticleTranslation(article.id, activeLanguage);
        if (cached) {
          setTranslatedArticle(cached);
        }
      }
    }
  }, [activeLanguage, article?.id]);

  // Detect Country on Load for international visitors
  useEffect(() => {
    if (!article || !article.id) return;

    const detectLocation = async () => {
      try {
        let country = sessionStorage.getItem('visitor_country');
        if (!country) {
          const geoRes = await fetch('https://ipapi.co/json/');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData && geoData.country_code) {
              country = geoData.country_code;
              sessionStorage.setItem('visitor_country', country);
            }
          }
        }
        if (!country || country === 'ID') {
          setDetectedLang('id');
          return;
        }
        const targetLang = COUNTRY_TO_LANG_MAP[country] || 'en';
        if (targetLang === 'id') {
          setDetectedLang('id');
          return;
        }
        setDetectedLang(targetLang);
        if (activeLanguage === 'id') {
          setShowBanner(true); // Show international visitor suggestion banner
        }
      } catch (err) {
        console.warn("Failed to detect visitor location:", err);
      }
    };
    detectLocation();
  }, [article?.id, activeLanguage]);

  const triggerTranslation = useCallback(async (targetLangOverride) => {
    const targetLang = targetLangOverride || detectedLang || activeLanguage || 'en';
    if (targetLang === 'id') {
      setTranslatedArticle(null);
      setCurrentTargetLang('id');
      setShowBanner(false);
      return;
    }

    if (!article || !article.id || !article.content) return;

    // Avoid redundant translating if already completed
    if (translatedArticle && currentTargetLang === targetLang && translatedArticle.title && translatedArticle.content) {
      return;
    }

    if (inFlightRef.current) return;

    const cacheKey = `${article.id}_${targetLang}`;
    setCurrentTargetLang(targetLang);

    // 1. Check Memory Cache
    if (memoryArticleCache.has(cacheKey)) {
      setTranslatedArticle(memoryArticleCache.get(cacheKey));
      setShowBanner(false);
      return;
    }

    // 2. Check LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const localCached = localStorage.getItem(`bedain_art_trans_${cacheKey}`);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          if (parsed && parsed.title && parsed.content) {
            memoryArticleCache.set(cacheKey, parsed);
            setTranslatedArticle(parsed);
            setShowBanner(false);
            return;
          }
        }
      } catch (e) {}
    }

    setTranslating(true);
    setError(null);
    inFlightRef.current = true;

    try {
      // 3. Check Firestore Cache
      let cachedInFirestore = null;
      try {
        const translationRef = doc(db, `articles/${article.id}/translations`, targetLang);
        const translationSnap = await getDoc(translationRef);

        if (translationSnap.exists()) {
          const cachedData = translationSnap.data();
          if (cachedData && cachedData.title && cachedData.content) {
            cachedInFirestore = cachedData;
          }
        }
      } catch (firestoreErr) {
        console.warn("Firestore translation cache check notice:", firestoreErr);
      }

      if (cachedInFirestore) {
        memoryArticleCache.set(cacheKey, cachedInFirestore);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`bedain_art_trans_${cacheKey}`, JSON.stringify(cachedInFirestore));
          } catch (e) {}
        }
        setTranslatedArticle(cachedInFirestore);
        setShowBanner(false);
        setTranslating(false);
        inFlightRef.current = false;
        return;
      }

      // 4. Translate via server endpoint /api/translate-article
      let translatedData = null;
      try {
        const response = await fetch('/api/translate-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: article.id,
            title: article.title,
            seoDescription: article.seoDescription || article.excerpt || '',
            keyPoints: article.keyPoints || [],
            content: article.content,
            targetLang
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.translation) {
            translatedData = resData.translation;
          }
        }
      } catch (apiErr) {
        console.warn("/api/translate-article error, trying client-side fallback:", apiErr);
      }

      // 5. Fallback directly to client-side chunked translation if API failed
      if (!translatedData || !translatedData.content) {
        const [title, desc, content] = await Promise.all([
          clientTranslateChunk(article.title, targetLang),
          clientTranslateChunk(article.seoDescription || article.excerpt || '', targetLang),
          clientTranslateHtml(article.content, targetLang)
        ]);

        let keyPoints = [];
        if (Array.isArray(article.keyPoints) && article.keyPoints.length > 0) {
          keyPoints = await Promise.all(article.keyPoints.map(kp => clientTranslateChunk(kp, targetLang)));
        }

        translatedData = {
          articleId: article.id,
          title: title || article.title,
          seoDescription: desc || article.seoDescription || '',
          excerpt: desc || article.excerpt || '',
          keyPoints,
          content: content || article.content,
          targetLang,
          translatedAt: new Date().toISOString()
        };
      }

      if (translatedData && translatedData.content) {
        memoryArticleCache.set(cacheKey, translatedData);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`bedain_art_trans_${cacheKey}`, JSON.stringify(translatedData));
          } catch (e) {}
        }
        setTranslatedArticle(translatedData);
        setShowBanner(false);

        // Save to public Firestore cache for other readers
        try {
          const translationRef = doc(db, `articles/${article.id}/translations`, targetLang);
          setDoc(translationRef, {
            ...translatedData,
            targetLang,
            translatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn("Firestore cache save notice:", err));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Auto-translation failed:", err);
      setError("Gagal menerjemahkan artikel.");
    } finally {
      setTranslating(false);
      inFlightRef.current = false;
    }
  }, [article, detectedLang, activeLanguage, currentTargetLang, translatedArticle]);

  const resetTranslation = useCallback(() => {
    setTranslatedArticle(null);
    setCurrentTargetLang('id');
  }, []);

  return { 
    translating, 
    translatedArticle, 
    detectedLang, 
    currentTargetLang, 
    showBanner, 
    setShowBanner, 
    error, 
    LANG_NAMES, 
    triggerTranslation, 
    resetTranslation 
  };
};

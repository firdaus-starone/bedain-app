"use client";
import { useState, useEffect } from 'react';
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

// Global in-memory cache to prevent duplicate fetches within the session
const memoryArticleCache = new Map();

export const useTranslation = (article, activeLanguage) => {
  const [translating, setTranslating] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [detectedLang, setDetectedLang] = useState('id'); // Default to Indonesia
  const [currentTargetLang, setCurrentTargetLang] = useState(activeLanguage || 'id');
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState(null);

  // Detect Country on Load
  useEffect(() => {
    if (!article || !article.id || !article.title || !article.content) return;
    setTranslatedArticle(null);
    setError(null);
    setShowBanner(false);

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
        setShowBanner(true); // Show the translation banner
      } catch (err) {
        console.error("Failed to detect location:", err);
      }
    };
    detectLocation();
  }, [article?.id]);

  const triggerTranslation = async (targetLangOverride) => {
    const targetLang = targetLangOverride || detectedLang || 'en';
    if (targetLang === 'id') {
      setTranslatedArticle(null);
      setCurrentTargetLang('id');
      setShowBanner(false);
      return;
    }

    if (!article || !article.id || !article.content) return;

    // Avoid redundant translating if already translated to this lang
    if (translatedArticle && currentTargetLang === targetLang && translatedArticle.title) {
      return;
    }

    const cacheKey = `${article.id}_${targetLang}`;
    setCurrentTargetLang(targetLang);

    // 1. Cek Memory Cache
    if (memoryArticleCache.has(cacheKey)) {
      setTranslatedArticle(memoryArticleCache.get(cacheKey));
      setShowBanner(false);
      return;
    }

    // 2. Cek LocalStorage
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

    try {
      // 3. Cek Firestore Cache
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
        return;
      }

      // 4. Terjemahkan via server endpoint /api/translate-article
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

      if (!response.ok) {
        throw new Error(`Terjemahan gagal status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success && resData.translation) {
        const translatedData = resData.translation;
        memoryArticleCache.set(cacheKey, translatedData);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`bedain_art_trans_${cacheKey}`, JSON.stringify(translatedData));
          } catch (e) {}
        }
        setTranslatedArticle(translatedData);
        setShowBanner(false);

        // Simpan ke cache Firestore publik untuk pembaca lain
        try {
          const translationRef = doc(db, `articles/${article.id}/translations`, targetLang);
          setDoc(translationRef, {
            ...translatedData,
            targetLang,
            translatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn("Firestore cache save notice:", err));
        } catch (e) {}
      } else {
        throw new Error(resData.error || 'Respons terjemahan tidak valid');
      }
    } catch (err) {
      console.error("Auto-translation failed:", err);
      setError("Gagal menerjemahkan artikel.");
    } finally {
      setTranslating(false);
    }
  };

  const resetTranslation = () => {
    setTranslatedArticle(null);
    setCurrentTargetLang('id');
  };

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

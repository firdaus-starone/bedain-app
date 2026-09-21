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

export const useTranslation = (article) => {
  const [translating, setTranslating] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [detectedLang, setDetectedLang] = useState('id'); // Default to Indonesia
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

  const triggerTranslation = async () => {
    if (detectedLang === 'id') return;
    setTranslating(true);
    setError(null);

    try {
      // Check Firestore Cache first
      const translationRef = doc(db, `articles/${article.id}/translations`, detectedLang);
      const translationSnap = await getDoc(translationRef);

      if (translationSnap.exists()) {
        setTranslatedArticle(translationSnap.data());
        setShowBanner(false);
        setTranslating(false);
        return;
      }

      // Need to translate via Gemini API
      const apiKey = localStorage.getItem('bedain_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
         console.error("Gemini API key not found for translation.");
         setTranslating(false);
         return;
      }

      const prompt = `Translate the following news article from Indonesian to ${LANG_NAMES[detectedLang]}.
Preserve all HTML tags perfectly, do not remove any <p> or <br> or <strong> etc.
Only translate the textual content.

Title: ${article.title}
SEO Description: ${article.seoDescription || ''}
Content HTML:
${article.content}

Return a valid JSON object with the exact keys: "title", "seoDescription", "content".
Do not wrap with markdown backticks, just raw JSON.`;

      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      });

      const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
        'gemini-pro'
      ];

      let response;
      let data;
      let success = false;

      // 1. Coba daftar model standar terlebih dahulu
      for (const modelName of modelsToTry) {
        try {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
          });
          data = await response.json();
          if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            success = true;
            break;
          }
        } catch (e) {
          console.warn(`useTranslation model ${modelName} gagal dipanggil:`, e);
        }
      }

      // 2. Jika semua model standar gagal, lakukan auto-discovery model loop
      if (!success) {
        console.log('Model standar gagal di useTranslation, mencoba auto-discovery model...');
        try {
          const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const listData = await listResponse.json();
          if (listData.models && listData.models.length > 0) {
            const availableModels = listData.models
              .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
              .filter(m => !m.name.includes('vision') && !m.name.includes('embedding') && !m.name.includes('aqa'))
              .sort((a, b) => {
                const score = (name) => {
                  if (name.includes('1.5-flash')) return 10;
                  if (name.includes('1.5-pro')) return 9;
                  if (name.includes('2.0-flash')) return 8;
                  if (name.includes('gemini-pro')) return 7;
                  if (name.includes('2.5')) return 1;
                  return 5;
                };
                return score(b.name) - score(a.name);
              });

            for (const model of availableModels) {
              const resolvedModelName = model.name.replace('models/', '');
              try {
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${resolvedModelName}:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: requestBody
                });
                data = await response.json();
                if (response.ok && !data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                  console.log('Auto-discovery useTranslation berhasil dengan model:', resolvedModelName);
                  success = true;
                  break;
                }
              } catch (err) {
                console.warn(`Auto-discovery model ${resolvedModelName} gagal:`, err);
              }
            }
          }
        } catch (err) {
          console.error('Gagal mengambil daftar model auto-discovery:', err);
        }
      }

      if (!success || !response?.ok || data?.error) {
        throw new Error(data?.error?.message || 'Gagal menghubungi Gemini API di useTranslation');
      }

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const jsonText = data.candidates[0].content.parts[0].text;
        const translatedData = JSON.parse(jsonText);
        if (translatedData.title && translatedData.content) {
          setTranslatedArticle(translatedData);
          setShowBanner(false);
          setDoc(translationRef, translatedData, { merge: true }).catch(e => console.error(e));
        } else {
           throw new Error("Invalid translation response structure");
        }
      } else {
        throw new Error("No translation returned");
      }
    } catch (err) {
      console.error("Auto-translation failed:", err);
      setError("Failed to translate article.");
    } finally {
      setTranslating(false);
    }
  };

  return { translating, translatedArticle, detectedLang, showBanner, error, LANG_NAMES, triggerTranslation };
};

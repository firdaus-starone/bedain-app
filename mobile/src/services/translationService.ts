import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type SupportedLanguage = 'id' | 'en' | 'zh';

export const TARGET_LANG_MAP: Record<SupportedLanguage, string> = {
  id: 'id',
  en: 'en',
  zh: 'zh-CN',
};

// In-memory caches to guarantee fast synchronous lookups during render
const textMemoryCache: Record<string, Record<string, string>> = {
  en: {},
  zh: {},
};

const articleMemoryCache = new Map<string, TranslatedArticlePayload>();

// Debounced batch translation queue
let pendingBatch = new Set<string>();
let batchTimeout: any = null;
const batchListeners = new Set<() => void>();

export const subscribeToTranslations = (listener: () => void) => {
  batchListeners.add(listener);
  return () => {
    batchListeners.delete(listener);
  };
};

const notifyBatchListeners = () => {
  batchListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.warn('Translation listener error:', e);
    }
  });
};

export const isValidTranslation = (original: string, translated: string, targetLang: string): boolean => {
  if (!translated || typeof translated !== 'string') return false;
  const origTrim = (original || '').trim();
  const transTrim = translated.trim();
  if (!origTrim || !transTrim) return false;

  if (targetLang === 'zh') {
    // If original is non-Chinese, translation must contain Chinese characters and not match original
    if (!/[\u4e00-\u9fa5]/.test(origTrim)) {
      if (origTrim === transTrim || !/[\u4e00-\u9fa5]/.test(transTrim)) {
        return false;
      }
    }
  }

  if (targetLang === 'en') {
    if (origTrim.length > 15 && origTrim.toLowerCase() === transTrim.toLowerCase()) {
      return false;
    }
  }

  return true;
};

// Load cached text translations from AsyncStorage on startup
export const initTranslationStorage = async (targetLang: SupportedLanguage) => {
  if (targetLang === 'id') return;
  try {
    const raw = await AsyncStorage.getItem(`bedain_trans_${targetLang}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        textMemoryCache[targetLang] = {
          ...parsed,
          ...(textMemoryCache[targetLang] || {}),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load translations from AsyncStorage:', e);
  }
};

// Persist memory cache to AsyncStorage
const persistTextCache = async (targetLang: SupportedLanguage) => {
  try {
    if (textMemoryCache[targetLang]) {
      await AsyncStorage.setItem(
        `bedain_trans_${targetLang}`,
        JSON.stringify(textMemoryCache[targetLang])
      );
    }
  } catch (e) {
    console.warn('Failed to persist translations to AsyncStorage:', e);
  }
};

// Fallback for single text translation (MyMemory / Bedain Web API)
const translateSingleFallback = async (text: string, targetLang: SupportedLanguage): Promise<string | null> => {
  const clean = text.trim();
  if (!clean || targetLang === 'id') return clean;
  const tl = TARGET_LANG_MAP[targetLang] || targetLang;

  // 1. MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=id|${tl}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BedainNewsMobile/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText?.trim();
      if (trans && isValidTranslation(clean, trans, targetLang)) {
        return trans;
      }
    }
  } catch (e) {}

  // 2. Bedain Web API
  try {
    const res = await fetch('https://bedainnews.com/api/translate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [clean], targetLang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.translations) && data.translations[0]) {
        const trans = data.translations[0].trim();
        if (isValidTranslation(clean, trans, targetLang)) {
          return trans;
        }
      }
    }
  } catch (e) {}

  return null;
};

// Process batch text translation
const processBatchQueue = async (targetLang: SupportedLanguage) => {
  if (pendingBatch.size === 0 || targetLang === 'id') return;

  const textsToTranslate = Array.from(pendingBatch);
  pendingBatch.clear();

  const tl = TARGET_LANG_MAP[targetLang] || targetLang;
  const DELIM = '<hr id="b-delim" />';
  const chunkSize = 15;

  for (let i = 0; i < textsToTranslate.length; i += chunkSize) {
    const chunk = textsToTranslate.slice(i, i + chunkSize);
    const payload = chunk.map(t => (t ? t.trim() : '<!--empty-->')).join(DELIM);
    let chunkSucceeded = false;

    try {
      const body = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: tl,
        dt: 't',
        q: payload,
      });

      const res = await fetch('https://translate.googleapis.com/translate_a/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: body.toString(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json[0])) {
          const raw = json[0].map((p: any) => p[0] || '').join('');
          const parts = raw.split(/<hr[^>]*id=["']?b-delim["']?[^>]*\/?>/i);

          if (parts.length === chunk.length) {
            if (!textMemoryCache[targetLang]) textMemoryCache[targetLang] = {};

            parts.forEach((part: string, idx: number) => {
              const orig = chunk[idx];
              const trans = part.replace(/<!--\s*empty\s*-->/gi, '').trim();

              if (isValidTranslation(orig, trans, targetLang)) {
                textMemoryCache[targetLang][orig] = trans;
                textMemoryCache[targetLang][orig.trim()] = trans;
              }
            });
            chunkSucceeded = true;
          }
        }
      }
    } catch (e) {
      console.warn('Batch translation request error:', e);
    }

    // Fallback for failed items in chunk
    if (!chunkSucceeded) {
      await Promise.all(
        chunk.map(async item => {
          const trans = await translateSingleFallback(item, targetLang);
          if (trans && isValidTranslation(item, trans, targetLang)) {
            if (!textMemoryCache[targetLang]) textMemoryCache[targetLang] = {};
            textMemoryCache[targetLang][item] = trans;
            textMemoryCache[targetLang][item.trim()] = trans;
          }
        })
      );
    }
  }

  // Persist updated translations and notify subscribers
  await persistTextCache(targetLang);
  notifyBatchListeners();
};

// Queue a text for translation in the background
export const queueTextTranslation = (text: string, targetLang: SupportedLanguage) => {
  if (!text || targetLang === 'id') return;
  const clean = text.trim();
  if (!clean) return;

  const cached = textMemoryCache[targetLang]?.[clean] || textMemoryCache[targetLang]?.[text];
  if (cached && isValidTranslation(clean, cached, targetLang)) return;

  pendingBatch.add(clean);

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    processBatchQueue(targetLang);
  }, 60);
};

// Synchronous cached lookup
export const getCachedTranslation = (text: string, targetLang: SupportedLanguage): string | null => {
  if (!text || targetLang === 'id') return text;
  const clean = text.trim();
  const cached = textMemoryCache[targetLang]?.[clean] || textMemoryCache[targetLang]?.[text];
  if (cached && isValidTranslation(clean, cached, targetLang)) {
    return cached;
  }
  return null;
};

export interface TranslatedArticlePayload {
  title: string;
  excerpt: string;
  content: string;
  keyPoints?: string[];
  imageCaption?: string;
  targetLang: string;
}

// Full Article Translation
export const translateFullArticle = async (
  article: {
    id: string;
    title?: string;
    excerpt?: string;
    summary?: string;
    seoDescription?: string;
    description?: string;
    content?: string;
    keyPoints?: string[];
    imageCaption?: string;
    caption?: string;
    title_en?: string;
    title_zh?: string;
    content_en?: string;
    content_zh?: string;
    excerpt_en?: string;
    excerpt_zh?: string;
  },
  targetLang: SupportedLanguage
): Promise<TranslatedArticlePayload | null> => {
  if (!article || !article.id || targetLang === 'id') return null;

  const cacheKey = `${article.id}_${targetLang}`;

  // 1. Check memory cache
  if (articleMemoryCache.has(cacheKey)) {
    return articleMemoryCache.get(cacheKey)!;
  }

  // 2. Check AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(`bedain_art_full_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.title && parsed.content) {
        articleMemoryCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (e) {}

  // 3. Check Firestore subcollection articles/{id}/translations/{targetLang}
  try {
    const transRef = doc(db, 'articles', article.id, 'translations', targetLang);
    const transSnap = await getDoc(transRef);
    if (transSnap.exists()) {
      const data = transSnap.data();
      if (data && data.title && data.content) {
        const payload: TranslatedArticlePayload = {
          title: data.title,
          excerpt: data.excerpt || data.seoDescription || '',
          content: data.content,
          keyPoints: data.keyPoints || [],
          imageCaption: data.imageCaption || '',
          targetLang,
        };
        articleMemoryCache.set(cacheKey, payload);
        AsyncStorage.setItem(`bedain_art_full_${cacheKey}`, JSON.stringify(payload)).catch(() => {});
        return payload;
      }
    }
  } catch (e) {
    console.warn('Firestore translation check notice:', e);
  }

  // 4. Translate via Google Translate endpoint
  const tl = TARGET_LANG_MAP[targetLang] || targetLang;
  const DELIM = '<hr id="b-delim" />';
  const title = (targetLang === 'en' && article.title_en) ? article.title_en : ((targetLang === 'zh' && article.title_zh) ? article.title_zh : (article.title || ''));
  const excerpt = (targetLang === 'en' && article.excerpt_en) ? article.excerpt_en : ((targetLang === 'zh' && article.excerpt_zh) ? article.excerpt_zh : (article.excerpt || article.summary || article.seoDescription || article.description || ''));
  const content = (targetLang === 'en' && article.content_en) ? article.content_en : ((targetLang === 'zh' && article.content_zh) ? article.content_zh : (article.content || ''));
  const imageCaption = article.imageCaption || article.caption || '';
  const keyPoints = article.keyPoints || [];

  const kpBlock = Array.isArray(keyPoints) && keyPoints.length > 0
    ? '<ul>' + keyPoints.map(k => '<li>' + k + '</li>').join('') + '</ul>'
    : '<!--no-kp-->';

  const combined = (title || '') + DELIM + (excerpt || '') + DELIM + kpBlock + DELIM + (imageCaption || '') + DELIM + (content || '');

  try {
    const body = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: tl,
      dt: 't',
      q: combined,
    });

    const res = await fetch('https://translate.googleapis.com/translate_a/single', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: body.toString(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json[0])) {
        const raw = json[0].map((p: any) => p[0] || '').join('');
        const parts = raw.split(/<hr[^>]*id=["']?b-delim["']?[^>]*\/?>/i);

        const transTitle = parts[0]?.trim() || title;
        const transExcerpt = parts[1]?.trim() || excerpt;

        let transKeyPoints: string[] = [];
        const rawKp = parts[2]?.trim();
        if (rawKp && rawKp.includes('<li>')) {
          const matched = rawKp.match(/<li>(.*?)<\/li>/gis);
          if (matched) {
            transKeyPoints = matched.map((s: string) => s.replace(/<\/?li>/gi, '').trim());
          }
        }

        const transImageCaption = parts[3]?.trim() || imageCaption;
        const transContent = parts.slice(4).join(DELIM)?.trim() || content;

        const result: TranslatedArticlePayload = {
          title: transTitle,
          excerpt: transExcerpt,
          content: transContent,
          keyPoints: transKeyPoints.length > 0 ? transKeyPoints : (article.keyPoints || []),
          imageCaption: transImageCaption,
          targetLang,
        };

        // Cache locally
        articleMemoryCache.set(cacheKey, result);
        AsyncStorage.setItem(`bedain_art_full_${cacheKey}`, JSON.stringify(result)).catch(() => {});

        // Cache title & imageCaption in text cache
        if (!textMemoryCache[targetLang]) textMemoryCache[targetLang] = {};
        if (article.title) {
          textMemoryCache[targetLang][article.title] = transTitle;
          textMemoryCache[targetLang][article.title.trim()] = transTitle;
        }
        if (imageCaption) {
          textMemoryCache[targetLang][imageCaption] = transImageCaption;
          textMemoryCache[targetLang][imageCaption.trim()] = transImageCaption;
        }

        // Cache to Firestore for future readers
        try {
          const transDocRef = doc(db, 'articles', article.id, 'translations', targetLang);
          setDoc(transDocRef, {
            ...result,
            translatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } catch (e) {}

        return result;
      }
    }
  } catch (e) {
    console.warn('Failed to translate full article via Google, trying Bedain web endpoint:', e);
  }

  // 5. Fallback via Bedain Web API
  try {
    const res = await fetch('https://bedainnews.com/api/translate-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article.id,
        title,
        seoDescription: excerpt,
        keyPoints,
        content,
        targetLang,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.translation) {
        const transData = resData.translation;
        const result: TranslatedArticlePayload = {
          title: transData.title || title,
          excerpt: transData.excerpt || transData.seoDescription || excerpt,
          content: transData.content || content,
          keyPoints: transData.keyPoints || keyPoints,
          targetLang,
        };

        articleMemoryCache.set(cacheKey, result);
        AsyncStorage.setItem(`bedain_art_full_${cacheKey}`, JSON.stringify(result)).catch(() => {});
        return result;
      }
    }
  } catch (e) {
    console.warn('Fallback translate-article also failed:', e);
  }

  return null;
};

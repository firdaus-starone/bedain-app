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

export interface TranslatedArticlePayload {
  title: string;
  excerpt: string;
  content: string;
  keyPoints?: string[];
  imageCaption?: string;
  targetLang: string;
}

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
  batchListeners.forEach((listener) => {
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

/**
 * Robust online translation for a single text or HTML block
 * 1. Google Translate official Android API (GET with client=at)
 * 2. MyMemory Translated API with valid email (no daily limit warning)
 * 3. Bedain Web Next.js API
 */
export const translateSingleOnline = async (text: string, targetLang: SupportedLanguage): Promise<string> => {
  const clean = (text || '').trim();
  if (!clean || targetLang === 'id') return text;

  const tl = TARGET_LANG_MAP[targetLang] || targetLang;

  // 1. Google Translate Android API (highly reliable, no 429 captcha)
  try {
    const url = `https://translate.google.com/translate_a/single?client=at&dt=t&dj=1&sl=auto&tl=${tl}&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GoogleTranslate/6.28.0.05.357165030 (Linux; U; Android 12; Pixel 6)',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.sentences)) {
        const trans = json.sentences.map((s: any) => s.trans || '').join('');
        if (trans && isValidTranslation(clean, trans, targetLang)) {
          return trans;
        }
      }
    }
  } catch (e) {
    // try fallback
  }

  // 2. MyMemory API with verified contact parameter
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=id|${tl}&de=redaksi@bedainnews.com`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BedainNewsMobile/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText?.trim();
      if (trans && !trans.includes('MYMEMORY WARNING') && isValidTranslation(clean, trans, targetLang)) {
        return trans;
      }
    }
  } catch (e) {
    // try next fallback
  }

  // 3. Bedain Web API
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
  } catch (e) {
    // fail silently and return original
  }

  return text;
};

// Process batch text translation for UI labels
const processBatchQueue = async (targetLang: SupportedLanguage) => {
  if (pendingBatch.size === 0 || targetLang === 'id') return;

  const textsToTranslate = Array.from(pendingBatch);
  pendingBatch.clear();

  const chunkSize = 6;
  for (let i = 0; i < textsToTranslate.length; i += chunkSize) {
    const chunk = textsToTranslate.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (item) => {
        const trans = await translateSingleOnline(item, targetLang);
        if (trans && isValidTranslation(item, trans, targetLang)) {
          if (!textMemoryCache[targetLang]) textMemoryCache[targetLang] = {};
          textMemoryCache[targetLang][item] = trans;
          textMemoryCache[targetLang][item.trim()] = trans;
        }
      })
    );
  }

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

export const getCachedArticleTranslation = (
  articleId: string,
  targetLang: SupportedLanguage
): TranslatedArticlePayload | null => {
  if (!articleId || targetLang === 'id') return null;
  const cacheKey = `${articleId}_${targetLang}`;
  return articleMemoryCache.get(cacheKey) || null;
};

/**
 * Intelligent HTML body translation that splits into block chunks,
 * translates them concurrently while preserving tags, images, and formatting.
 */
export const translateHtmlContent = async (html: string, targetLang: SupportedLanguage): Promise<string> => {
  if (!html || !html.trim() || targetLang === 'id') return html;

  // Split at closing block tags
  const parts = html.split(/(<\/(?:p|h[1-6]|blockquote|li|div)>)/i);

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i] || '';
    const closingTag = parts[i + 1] || '';
    const block = content + closingTag;

    // Keep standalone image tags intact
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

  // Translate all chunks concurrently
  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      // If purely an img tag, don't send to translation
      if (/^<p[^>]*>\s*<img[^>]*\/?>\s*<\/p>$/i.test(chunk.trim())) {
        return chunk;
      }
      return translateSingleOnline(chunk, targetLang);
    })
  );

  return translatedChunks.join('');
};

// Full Article Translation (Title, Excerpt, Content HTML, Key Points, Image Caption)
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

  // 1. Check in-memory cache
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

  // 4. Perform dynamic translation of all parts in parallel
  const title =
    targetLang === 'en' && article.title_en
      ? article.title_en
      : targetLang === 'zh' && article.title_zh
      ? article.title_zh
      : article.title || '';

  const excerpt =
    targetLang === 'en' && article.excerpt_en
      ? article.excerpt_en
      : targetLang === 'zh' && article.excerpt_zh
      ? article.excerpt_zh
      : article.excerpt || article.summary || article.seoDescription || article.description || '';

  const content =
    targetLang === 'en' && article.content_en
      ? article.content_en
      : targetLang === 'zh' && article.content_zh
      ? article.content_zh
      : article.content || '';

  const imageCaption = article.imageCaption || article.caption || '';
  const keyPoints = article.keyPoints || [];

  try {
    const [transTitle, transExcerpt, transImageCaption, transKeyPoints, transContent] = await Promise.all([
      translateSingleOnline(title, targetLang),
      translateSingleOnline(excerpt, targetLang),
      imageCaption ? translateSingleOnline(imageCaption, targetLang) : Promise.resolve(''),
      Array.isArray(keyPoints) && keyPoints.length > 0
        ? Promise.all(keyPoints.map((kp) => translateSingleOnline(kp, targetLang)))
        : Promise.resolve([]),
      translateHtmlContent(content, targetLang),
    ]);

    const result: TranslatedArticlePayload = {
      title: transTitle || title,
      excerpt: transExcerpt || excerpt,
      content: transContent || content,
      keyPoints: transKeyPoints.length > 0 ? transKeyPoints : keyPoints,
      imageCaption: transImageCaption || imageCaption,
      targetLang,
    };

    // Cache locally in memory & AsyncStorage
    articleMemoryCache.set(cacheKey, result);
    AsyncStorage.setItem(`bedain_art_full_${cacheKey}`, JSON.stringify(result)).catch(() => {});

    // Cache title & imageCaption in text cache
    if (!textMemoryCache[targetLang]) textMemoryCache[targetLang] = {};
    if (article.title && transTitle) {
      textMemoryCache[targetLang][article.title] = transTitle;
      textMemoryCache[targetLang][article.title.trim()] = transTitle;
    }
    if (imageCaption && transImageCaption) {
      textMemoryCache[targetLang][imageCaption] = transImageCaption;
      textMemoryCache[targetLang][imageCaption.trim()] = transImageCaption;
    }

    // Cache to Firestore for future readers
    try {
      const transDocRef = doc(db, 'articles', article.id, 'translations', targetLang);
      setDoc(
        transDocRef,
        {
          ...result,
          translatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch (e) {}

    return result;
  } catch (e) {
    console.warn('Failed to translate full article:', e);
  }

  // 5. Fallback via Bedain Web API if any
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
          imageCaption: transData.imageCaption || imageCaption,
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

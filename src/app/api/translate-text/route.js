import { NextResponse } from 'next/server';

const LANG_CODE_MAP = {
  zh: 'zh-CN',
  en: 'en',
  id: 'id',
  ar: 'ar',
  ja: 'ja',
  ko: 'ko',
  ms: 'ms',
  fr: 'fr',
  de: 'de',
  es: 'es',
  ru: 'ru',
  pt: 'pt',
  hi: 'hi',
  th: 'th',
  vi: 'vi',
  nl: 'nl',
};

async function translateWithMyMemory(text, targetLang) {
  try {
    const clean = (text || '').trim();
    if (!clean) return '';
    const tl = targetLang === 'zh' || targetLang === 'zh-CN' ? 'zh-CN' : targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=id|${tl}`;
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'BedainNews/1.0 (https://bedainnews.com)' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText?.trim();
      if (trans && trans.toLowerCase() !== clean.toLowerCase()) {
        if (targetLang === 'zh' && /[\u4e00-\u9fa5]/.test(trans)) return trans;
        if (targetLang === 'en') return trans;
        return trans;
      }
    }
  } catch (e) {
    console.warn('MyMemory fallback error:', e.message);
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { texts, targetLang } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    if (!targetLang || targetLang === 'id') {
      return NextResponse.json({ translations: texts });
    }

    const tl = LANG_CODE_MAP[targetLang] || targetLang;

    // Filter out empty texts while preserving indices
    const cleanedTexts = texts.map((t) => (typeof t === 'string' ? t.trim() : ''));

    const DELIMITER = '<hr id="b-delim" />';
    const chunkSize = 15;
    const allTranslations = [];

    for (let i = 0; i < cleanedTexts.length; i += chunkSize) {
      const chunk = cleanedTexts.slice(i, i + chunkSize);

      // Pre-check: if all items are empty, skip
      if (chunk.every(t => !t)) {
        allTranslations.push(...chunk);
        continue;
      }

      // Check if target is Chinese and text already contains Chinese characters
      const isTargetZh = targetLang === 'zh';
      const itemsToTranslate = chunk.map(text => {
        if (!text) return '';
        if (isTargetZh && /[\u4e00-\u9fa5]/.test(text)) {
          return ''; // Already Chinese, don't send to translation
        }
        return text;
      });

      const payload = itemsToTranslate.map(t => t || '<!--empty-->').join(DELIMITER);
      let chunkTranslated = false;

      try {
        const postData = new URLSearchParams({
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          body: postData.toString(),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json[0])) {
            const rawTranslatedString = json[0].map((part) => part[0] || '').join('');
            const splitted = rawTranslatedString.split(/<hr[^>]*id=["']?b-delim["']?[^>]*\/?>/i);

            if (splitted.length === chunk.length) {
              for (let j = 0; j < chunk.length; j++) {
                if (!itemsToTranslate[j]) {
                  allTranslations.push(chunk[j]);
                } else {
                  const trans = splitted[j] ? splitted[j].replace(/<!--\s*empty\s*-->/gi, '').trim() : '';
                  // Check if translation is valid
                  const isValid = isTargetZh ? /[\u4e00-\u9fa5]/.test(trans) : (trans && trans.toLowerCase() !== chunk[j].toLowerCase());
                  if (isValid) {
                    allTranslations.push(trans);
                  } else {
                    // Try fallback for this single item
                    const fb = await translateWithMyMemory(chunk[j], targetLang);
                    allTranslations.push(fb || chunk[j]);
                  }
                }
              }
              chunkTranslated = true;
            }
          }
        }
      } catch (err) {
        console.warn('Translate chunk via Google failed, trying fallback:', err.message);
      }

      // Fallback: If Google batch failed, translate items with MyMemory fallback
      if (!chunkTranslated) {
        const fallbackResults = await Promise.all(
          chunk.map(async (item) => {
            if (!item) return '';
            if (isTargetZh && /[\u4e00-\u9fa5]/.test(item)) return item;
            const mem = await translateWithMyMemory(item, targetLang);
            return mem || item;
          })
        );
        allTranslations.push(...fallbackResults);
      }
    }

    return NextResponse.json(
      { translations: allTranslations },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    console.error('API /api/translate-text error:', error);
    return NextResponse.json(
      { error: 'Translation failed', translations: [] },
      { status: 500 }
    );
  }
}

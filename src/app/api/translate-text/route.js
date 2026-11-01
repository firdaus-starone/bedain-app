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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: postData.toString(),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json[0])) {
            const rawTranslatedString = json[0].map((part) => part[0] || '').join('');
            const splitted = rawTranslatedString.split(/<hr[^>]*id=["']?b-delim["']?[^>]*\/?>/i);

            for (let j = 0; j < chunk.length; j++) {
              if (!itemsToTranslate[j]) {
                // If original was already Chinese or empty, keep original
                allTranslations.push(chunk[j]);
              } else {
                const trans = splitted[j] ? splitted[j].replace(/<!--\s*empty\s*-->/gi, '').trim() : '';
                allTranslations.push(trans || chunk[j]);
              }
            }
            continue;
          }
        }
      } catch (err) {
        console.warn('Translate chunk error:', err);
      }

      // Fallback: keep original chunk if translation failed
      allTranslations.push(...chunk);
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

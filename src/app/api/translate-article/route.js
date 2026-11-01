import { NextResponse } from 'next/server';

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

async function translateArticlePayload({ title, seoDescription, keyPoints, content, targetLang }) {
  const tl = LANG_CODE_MAP[targetLang] || targetLang;

  // Format key points as HTML list if present
  let kpBlock = '';
  if (Array.isArray(keyPoints) && keyPoints.length > 0) {
    kpBlock = '<ul>' + keyPoints.map((k) => '<li>' + k + '</li>').join('') + '</ul>';
  }

  // Combine into single payload using delimiter to translate the entire article in 1 single HTTP POST
  const DELIM = '<hr id="b-delim" />';
  const combined =
    (title || '') +
    DELIM +
    (seoDescription || '') +
    DELIM +
    kpBlock +
    DELIM +
    (content || '');

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
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Google Translate error ${res.status}`);
  }

  const json = await res.json();
  if (!json || !Array.isArray(json[0])) {
    throw new Error('Invalid translation JSON format');
  }

  const rawTranslated = json[0].map((p) => p[0] || '').join('');
  const parts = rawTranslated.split(/<hr\s+id=["']b-delim["']\s*\/?>/i);

  const transTitle = parts[0]?.trim() || title;
  const transDesc = parts[1]?.trim() || seoDescription;

  let transKeyPoints = keyPoints;
  const rawKp = parts[2]?.trim();
  if (rawKp && rawKp.includes('<li>')) {
    const matched = rawKp.match(/<li>(.*?)<\/li>/gis);
    if (matched) {
      transKeyPoints = matched.map((s) => s.replace(/<\/?li>/gi, '').trim());
    }
  }

  // The rest is content (in case content had inner hr or remaining parts)
  const transContent = parts.slice(3).join(DELIM)?.trim() || content;

  return {
    title: transTitle,
    seoDescription: transDesc,
    excerpt: transDesc,
    keyPoints: transKeyPoints,
    content: transContent,
    targetLang,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { articleId, title, seoDescription, keyPoints, content, targetLang } = body;

    if (!targetLang || targetLang === 'id') {
      return NextResponse.json({
        success: true,
        translation: {
          articleId,
          title,
          seoDescription,
          keyPoints,
          content,
          targetLang: 'id',
        },
      });
    }

    const translated = await translateArticlePayload({
      title,
      seoDescription,
      keyPoints,
      content,
      targetLang,
    });

    const translationResult = {
      articleId,
      ...translated,
      translatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, translation: translationResult },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    console.error('API /api/translate-article error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Translation failed' },
      { status: 500 }
    );
  }
}

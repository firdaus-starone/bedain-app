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

async function translateChunk(text, targetLang) {
  if (!text || !text.trim()) return text;
  const tl = LANG_CODE_MAP[targetLang] || targetLang;

  // 1. Google Translate Android API (highly reliable, no 429 block)
  try {
    const url = `https://translate.google.com/translate_a/single?client=at&dt=t&dj=1&sl=auto&tl=${tl}&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GoogleTranslate/6.28.0.05.357165030 (Linux; U; Android 12; Pixel 6)',
      },
    });
    if (res.ok) {
      const data = await res.json();
      const trans = data.sentences?.map((s) => s.trans || '').join('');
      if (trans && trans.trim()) return trans;
    }
  } catch (e) {
    console.warn('Google client=at error in translate-article:', e.message);
  }

  // 2. MyMemory with authorized contact
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=id|${tl}&de=redaksi@bedainnews.com`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const trans = data.responseData?.translatedText;
      if (trans && !trans.includes('MYMEMORY WARNING')) return trans;
    }
  } catch (e) {
    console.warn('MyMemory error in translate-article:', e.message);
  }

  return text;
}

async function translateHtml(html, targetLang) {
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
      return translateChunk(chunk, targetLang);
    })
  );

  return translatedChunks.join('');
}

async function translateArticlePayload({ title, seoDescription, keyPoints, content, imageCaption, tags, targetLang }) {
  const [transTitle, transDesc, transKeyPoints, transContent, transCaption, transTags] = await Promise.all([
    translateChunk(title, targetLang),
    translateChunk(seoDescription, targetLang),
    Array.isArray(keyPoints) && keyPoints.length > 0
      ? Promise.all(keyPoints.map((kp) => translateChunk(kp, targetLang)))
      : Promise.resolve([]),
    translateHtml(content, targetLang),
    imageCaption ? translateChunk(imageCaption, targetLang) : Promise.resolve(''),
    Array.isArray(tags) && tags.length > 0
      ? Promise.all(tags.map((tag) => translateChunk(tag, targetLang)))
      : Promise.resolve([]),
  ]);

  return {
    title: transTitle || title,
    seoDescription: transDesc || seoDescription,
    excerpt: transDesc || seoDescription,
    keyPoints: transKeyPoints.length > 0 ? transKeyPoints : keyPoints,
    content: transContent || content,
    imageCaption: transCaption || imageCaption || '',
    tags: transTags.length > 0 ? transTags : (tags || []),
    targetLang,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { articleId, title, seoDescription, keyPoints, content, imageCaption, tags, targetLang } = body;

    if (!targetLang || targetLang === 'id') {
      return NextResponse.json({
        success: true,
        translation: {
          articleId,
          title,
          seoDescription,
          keyPoints,
          content,
          imageCaption: imageCaption || '',
          tags: tags || [],
          targetLang: 'id',
        },
      });
    }

    const translated = await translateArticlePayload({
      title,
      seoDescription,
      keyPoints,
      content,
      imageCaption,
      tags,
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

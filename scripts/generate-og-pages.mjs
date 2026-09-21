import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function generateOGPages() {
  console.log('Generating Open Graph pre-rendered HTML files for articles...');
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('dist/index.html not found. Make sure to run vite build first.');
    return;
  }

  let baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Fetch site settings for favicon & update dist/index.html directly
  try {
    const sRes = await fetch('https://firestore.googleapis.com/v1/projects/pionerhouse-app/databases/(default)/documents/settings/site');
    if (sRes.ok) {
      const sData = await sRes.json();
      const siteFaviconUrl = sData?.fields?.faviconUrl?.stringValue || '';
      const seoDefaultImage = sData?.fields?.seoDefaultImage?.stringValue || 'https://pionirhouse.com/logo.png';
      const seoDefaultTitle = sData?.fields?.seoDefaultTitle?.stringValue || 'Pionir House - Portal Berita Terpercaya';
      const seoDefaultDesc = sData?.fields?.seoDefaultDescription?.stringValue || 'Menyajikan berita terkini, teknologi, finansial, dan kebudayaan dengan standar jurnalisme modern.';

      if (siteFaviconUrl) {
        baseHtml = baseHtml
          .replace(/href="\/favicon-32\.png"/g, `href="${siteFaviconUrl}"`)
          .replace(/href="\/apple-touch-icon\.png"/g, `href="${siteFaviconUrl}"`);
      }

      const rootOgTags = `
    <!-- DEFAULT_OG_START -->
    <meta property="og:title" content="${seoDefaultTitle.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${seoDefaultDesc.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${seoDefaultImage.replace(/"/g, '&quot;')}" />
    <meta property="og:url" content="https://pionirhouse.com" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seoDefaultTitle.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${seoDefaultDesc.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${seoDefaultImage.replace(/"/g, '&quot;')}" />
    <!-- DEFAULT_OG_END -->`;

      baseHtml = baseHtml
        .replace(/<title>.*?<\/title>/i, `<title>${seoDefaultTitle.replace(/"/g, '&quot;')}</title>`)
        .replace(/<!-- DEFAULT_OG_START -->[\s\S]*?<!-- DEFAULT_OG_END -->/, rootOgTags);

      fs.writeFileSync(indexHtmlPath, baseHtml, 'utf-8');
      console.log('Injected latest settings into dist/index.html during build');
    }
  } catch (e) {
    console.warn('Could not fetch site settings for favicon during build:', e.message);
  }

  // Copy dist/index.html to functions/index.html for instant local reading by Cloud Functions
  try {
    const functionsHtmlPath = path.join(rootDir, 'functions', 'index.html');
    fs.writeFileSync(functionsHtmlPath, baseHtml, 'utf-8');
    console.log('Copied dist/index.html to functions/index.html for instant zero-latency Cloud Function reading!');
  } catch (err) {
    console.warn('Could not copy index.html to functions/:', err.message);
  }

  const articlesMap = new Map();

  // 1. Parse dummyArticles from src/lib/seedData.js
  try {
    const seedContent = fs.readFileSync(path.join(rootDir, 'src/lib/seedData.js'), 'utf-8');
    // Extract fields using more comprehensive regex if needed, but for seed we can use defaults
    const regex = /title:\s*"([^"]+)"[\s\S]*?slug:\s*"([^"]+)"[\s\S]*?excerpt:\s*"([^"]+)"[\s\S]*?coverImage:\s*"([^"]+)"/g;
    let match;
    while ((match = regex.exec(seedContent)) !== null) {
      const [, title, slug, excerpt, coverImage] = match;
      articlesMap.set(slug, { 
        title, slug, excerpt, coverImage, 
        publishedAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        authorName: 'Redaksi',
        category: 'Berita',
        tags: ''
      });
    }
    console.log(`Parsed ${articlesMap.size} articles from seedData.js`);
  } catch (err) {
    console.warn('Could not parse seedData.js:', err.message);
  }

  // 2. Fetch live articles from Firestore REST API
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/pionerhouse-app/databases/(default)/documents/articles?pageSize=1000');
    if (res.ok) {
      const data = await res.json();
      if (data && data.documents) {
        const getYouTubeId = (input) => {
          if (!input || typeof input !== 'string') return null;
          const iframeMatch = input.match(/src=["']([^"']+)["']/i);
          const targetUrl = iframeMatch ? iframeMatch[1] : input;
          const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
          const match = targetUrl.match(regExp);
          return match ? match[1] : null;
        };

        data.documents.forEach(doc => {
          const fields = doc.fields || {};
          const slug = fields.slug?.stringValue;
          const title = fields.title?.stringValue || 'Berita Pionir House';
          const content = fields.content?.stringValue || '';
          const excerpt = fields.seoDescription?.stringValue || fields.excerpt?.stringValue || content.replace(/<[^>]+>/g, '').slice(0, 150) || '';
          const videoUrl = fields.videoUrl?.stringValue || fields.youtubeUrl?.stringValue || fields.video?.stringValue || '';
          
          const videoId = getYouTubeId(videoUrl) || getYouTubeId(content);
          let coverImage = fields.coverImage?.stringValue || fields.imageUrl?.stringValue || '';
          if (!coverImage && videoId) {
            coverImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }
          if (!coverImage) {
            coverImage = 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80';
          }
          
          const publishedAt = fields.publishedAt?.timestampValue || fields.createdAt?.timestampValue || new Date().toISOString();
          const updatedAt = fields.updatedAt?.timestampValue || publishedAt;
          const authorName = fields.author?.mapValue?.fields?.name?.stringValue || fields.authorName?.stringValue || 'Redaksi';
          const category = fields.category?.stringValue || 'Berita';
          const tags = fields.tags?.arrayValue?.values?.map(v => v.stringValue).join(', ') || category;

          if (slug) {
            articlesMap.set(slug, { title, slug, excerpt, coverImage, publishedAt, updatedAt, authorName, category, tags });
          }
        });
        console.log(`Total unique articles combined with Firestore: ${articlesMap.size}`);
      }
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore REST API (using local seed map):', err.message);
  }

  // 3. Generate HTML file for each article
  let generatedCount = 0;
  for (const [slug, article] of articlesMap.entries()) {
    const escapedTitle = article.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const escapedExcerpt = (article.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const rawImageUrl = article.coverImage || 'https://pionirhouse.com/logo.png';
    // Ensure absolute URL - relative paths won't work for OG sharing
    const imageUrl = rawImageUrl.startsWith('http') 
      ? rawImageUrl 
      : `https://pionirhouse.com${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`;
    const escapedImageUrl = imageUrl.replace(/&/g, '&amp;');
    const imageMimeType = imageUrl.includes('.webp') ? 'image/webp' : imageUrl.includes('.png') ? 'image/png' : 'image/jpeg';
    const articleUrl = `https://pionirhouse.com/article/${slug}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": (article.title || "").substring(0, 110),
      "description": article.excerpt,
      "image": [imageUrl],
      "datePublished": article.publishedAt,
      "dateModified": article.updatedAt,
      "url": articleUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleUrl
      },
      "isAccessibleForFree": true,
      "author": {
        "@type": "Person",
        "name": article.authorName || "Redaksi Pionir",
        "url": "https://pionirhouse.com/page/redaksi"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Pionir House",
        "logo": {
          "@type": "ImageObject",
          "url": "https://pionirhouse.com/logo.png",
          "width": 600,
          "height": 60
        }
      },
      "articleSection": article.category,
      "keywords": article.tags,
      "inLanguage": "id-ID"
    };

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Beranda",
          "item": "https://pionirhouse.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": article.category || "Berita",
          "item": `https://pionirhouse.com/cari?q=${encodeURIComponent(article.category || 'Berita')}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": article.title,
          "item": articleUrl
        }
      ]
    };

    const ogTags = `
    <!-- Dynamic Article Open Graph & Twitter Card -->
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedExcerpt}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:image:secure_url" content="${escapedImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="${imageMimeType}" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Pionir House" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@pionirhouse" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedExcerpt}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />

    <!-- Google News & Breadcrumb JSON-LD -->
    <script type="application/ld+json">
      ${JSON.stringify([jsonLd, breadcrumbLd])}
    </script>
`;

    const customHtml = baseHtml
      .replace(/<title>.*?<\/title>/i, `<title>${escapedTitle} - Pionir House</title>`)
      .replace(/<!-- DEFAULT_OG_START -->[\s\S]*?<!-- DEFAULT_OG_END -->/, ogTags);

    // Write to dist/article/<slug>/index.html and dist/article/<slug>.html
    const articleDir = path.join(distDir, 'article', slug);
    fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(path.join(articleDir, 'index.html'), customHtml, 'utf-8');
    fs.writeFileSync(path.join(distDir, 'article', `${slug}.html`), customHtml, 'utf-8');

    // Also write to dist/berita/<slug>/index.html and dist/berita/<slug>.html
    const beritaDir = path.join(distDir, 'berita', slug);
    fs.mkdirSync(beritaDir, { recursive: true });
    fs.writeFileSync(path.join(beritaDir, 'index.html'), customHtml, 'utf-8');
    fs.writeFileSync(path.join(distDir, 'berita', `${slug}.html`), customHtml, 'utf-8');

    generatedCount++;
  }

  console.log(`Successfully generated OG pre-rendered index.html files for ${generatedCount} articles!`);

  // 4. Generate sitemap.xml for Google Search Indexing
  const currentDateISO = new Date().toISOString();
  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pionirhouse.com/</loc>
    <lastmod>${currentDateISO}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pionirhouse.com/cari?q=semua</loc>
    <lastmod>${currentDateISO}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pionirhouse.com/page/tentang-kami</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://pionirhouse.com/page/pedoman-siber</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://pionirhouse.com/page/redaksi</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

  let rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Pionir House - Portal Berita Modern</title>
  <link>https://pionirhouse.com</link>
  <description>Pionir House - Menyajikan berita terkini, teknologi, finansial, dan kebudayaan dengan standar jurnalisme modern.</description>
  <language>id-ID</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="https://pionirhouse.com/rss.xml" rel="self" type="application/rss+xml" />
`;

  for (const [slug, article] of articlesMap.entries()) {
    const escapedTitle = (article.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedExcerpt = (article.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const articleUrl = `https://pionirhouse.com/article/${slug}`;

    sitemapXml += `  <url>
    <loc>${articleUrl}</loc>
    <lastmod>${currentDateISO}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n`;

    rssXml += `  <item>
    <title><![CDATA[${escapedTitle}]]></title>
    <link>${articleUrl}</link>
    <guid isPermaLink="true">${articleUrl}</guid>
    <description><![CDATA[${escapedExcerpt}]]></description>
    <pubDate>${new Date().toUTCString()}</pubDate>
  </item>\n`;
  }

  sitemapXml += `</urlset>\n`;
  rssXml += `</channel>\n</rss>\n`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'rss.xml'), rssXml, 'utf-8');
  console.log('Successfully generated sitemap.xml and rss.xml!');
}

generateOGPages().catch(console.error);

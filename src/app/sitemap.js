export default async function sitemap() {
  const baseUrl = 'https://bedainnews.com';
  let articles = [];
  
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/bedain-eb6a6/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          select: {
            fields: [
              { fieldPath: 'slug' },
              { fieldPath: 'publishedAt' },
              { fieldPath: 'createdAt' },
              { fieldPath: 'status' },
              { fieldPath: 'category' },
              { fieldPath: 'videoUrl' },
              { fieldPath: 'youtubeUrl' }
            ]
          }
        }
      }),
      next: { revalidate: 3600 } 
    });
    
    if (res.ok) {
      const data = await res.json();
      const seenSlugs = new Set();

      articles = data
        .filter(item => item.document && item.document.fields && item.document.fields.slug)
        .map(item => {
          const fields = item.document.fields;
          const status = fields.status?.stringValue;
          
          // Abaikan draft, arsip, atau sampah
          if (status === 'draft' || status === 'archived' || status === 'trash' || status === 'deleted') {
            return null;
          }
          
          const rawSlug = fields.slug?.stringValue;
          if (!rawSlug || typeof rawSlug !== 'string' || !rawSlug.trim()) {
            return null;
          }
          const slug = rawSlug.trim();

          // Hindari duplikasi URL di sitemap
          if (seenSlugs.has(slug)) {
            return null;
          }
          seenSlugs.add(slug);
          
          let date = new Date().toISOString();
          if (fields.publishedAt && fields.publishedAt.timestampValue) {
            date = fields.publishedAt.timestampValue;
          } else if (fields.createdAt && fields.createdAt.timestampValue) {
            date = fields.createdAt.timestampValue;
          }
          
          if (status === 'scheduled') {
            const pubTime = new Date(date).getTime();
            if (pubTime > Date.now()) return null;
          }

          const category = fields.category?.stringValue;
          const videoUrl = fields.videoUrl?.stringValue;
          const youtubeUrl = fields.youtubeUrl?.stringValue;
          const isVideo = category === 'Video' || !!videoUrl || !!youtubeUrl || slug.startsWith('yt-');

          return { slug, date, isVideo };
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.error("Error generating sitemap", err);
  }

  const articleUrls = articles.map((article) => ({
    url: `${baseUrl}/${article.isVideo ? 'watch' : 'article'}/${article.slug}`,
    lastModified: article.date,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/video`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/kirim-tulisan`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/kontak`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...articleUrls,
  ];
}

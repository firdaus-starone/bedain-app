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
            fields: [{ fieldPath: 'slug' }, { fieldPath: 'publishedAt' }, { fieldPath: 'createdAt' }]
          },
          // You can add a where clause if you only want published articles
          // where: {
          //   fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } }
          // }
        }
      }),
      next: { revalidate: 3600 } 
    });
    
    if (res.ok) {
      const data = await res.json();
      articles = data
        .filter(item => item.document && item.document.fields && item.document.fields.slug)
        .map(item => {
          const fields = item.document.fields;
          const slug = fields.slug.stringValue;
          // Fallback to current time if no date field is found
          let date = new Date().toISOString();
          if (fields.publishedAt && fields.publishedAt.timestampValue) {
            date = fields.publishedAt.timestampValue;
          } else if (fields.createdAt && fields.createdAt.timestampValue) {
            date = fields.createdAt.timestampValue;
          }
          return { slug, date };
        });
    }
  } catch (err) {
    console.error("Error generating sitemap", err);
  }

  const articleUrls = articles.map((article) => ({
    url: `${baseUrl}/article/${article.slug}`,
    lastModified: article.date,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/cari`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/kirim-tulisan`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...articleUrls,
  ];
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/bedain-eb6a6/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
          limit: 30
        }
      }),
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) {
      return new NextResponse('Error fetching data', { status: 500 });
    }

    const data = await res.json();
    const siteUrl = 'https://bedainnews.com';

    let rssItems = '';

    if (data && data.length > 0) {
      data.forEach((item) => {
        if (!item.document) return;
        const fields = item.document.fields;
        
        const title = fields.title?.stringValue || '';
        const slug = fields.slug?.stringValue || '';
        const excerpt = fields.excerpt?.stringValue || '';
        const publishedAt = fields.publishedAt?.timestampValue || new Date().toISOString();
        const imageUrl = fields.imageUrl?.stringValue || '';
        const category = fields.category?.stringValue || 'Berita';
        
        // Status filter (since we didn't filter in REST API to avoid composite index issues)
        if (fields.status?.stringValue === 'draft') return;

        rssItems += `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${siteUrl}/article/${slug}</link>
      <guid isPermaLink="true">${siteUrl}/article/${slug}</guid>
      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${excerpt}]]></description>
      <category><![CDATA[${category}]]></category>
      ${imageUrl ? `<enclosure url="${imageUrl.replace(/&/g, '&amp;')}" type="image/jpeg" />` : ''}
    </item>`;
      });
    }

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Bedain News</title>
    <link>${siteUrl}</link>
    <description>Portal berita terkini dan terpercaya.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssFeed, {
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating RSS:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

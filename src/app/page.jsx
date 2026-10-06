import HomeClient from '../components/HomeClient';

async function getInitialArticles() {
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
      // Cache for 60 seconds. App Hosting will serve this static HTML for fast LCP
      next: { revalidate: 60 } 
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    
    if (data && data.length > 0) {
      const mappedArticles = data
        .filter(item => item.document) // runQuery returns empty objects if no match
        .map(item => {
          const doc = item.document;
          const fields = doc.fields;
          
          // Map REST API format back to normal JS object format
          const mapped = {
            id: doc.name.split('/').pop(),
          };
          
          for (const key in fields) {
            const val = fields[key];
            if (val.stringValue !== undefined) mapped[key] = val.stringValue;
            else if (val.integerValue !== undefined) mapped[key] = parseInt(val.integerValue, 10);
            else if (val.doubleValue !== undefined) mapped[key] = parseFloat(val.doubleValue);
            else if (val.booleanValue !== undefined) mapped[key] = val.booleanValue;
            else if (val.timestampValue !== undefined) {
              mapped[key] = val.timestampValue;
            } else if (val.arrayValue !== undefined) {
              mapped[key] = val.arrayValue.values ? val.arrayValue.values.map(v => v.stringValue || v.integerValue) : [];
            }
          }
          return mapped;
        });

      const now = new Date().getTime();
      return mappedArticles.filter(article => {
        if (article.status === 'draft') return false;
        if (article.status === 'scheduled') {
          const pubTime = new Date(article.publishedAt || article.scheduledAt).getTime();
          if (pubTime > now) return false;
        }
        return true;
      }).slice(0, 16);
    }
  } catch (error) {
    console.error('Error fetching initial articles:', error);
  }
  return [];
}

export default async function HomePage() {
  const initialArticles = await getInitialArticles();
  
  return <HomeClient initialArticles={initialArticles} />;
}

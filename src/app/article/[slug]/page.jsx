import ArticleDetailClient from '../../../components/ArticleDetailClient';

async function getArticleBySlug(slug) {
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/bedain-eb6a6/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: slug }
            }
          },
          limit: 1
        }
      }),
      // Next.js cache setting. We can revalidate periodically or keep it cached
      next: { revalidate: 60 } 
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data && data.length > 0 && data[0].document) {
      const doc = data[0].document.fields;
      return {
        title: doc.title?.stringValue || '',
        seoTitle: doc.seoTitle?.stringValue || '',
        seoDescription: doc.seoDescription?.stringValue || '',
        excerpt: doc.excerpt?.stringValue || '',
        content: doc.content?.stringValue || '',
        coverImage: doc.coverImage?.stringValue || doc.imageUrl?.stringValue || '',
        category: doc.category?.stringValue || '',
      };
    }
  } catch (error) {
    console.error('Error fetching article metadata:', error);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Artikel Tidak Ditemukan - BEDAINAPP',
      description: 'Artikel yang Anda cari tidak ditemukan.'
    };
  }

  const siteName = 'BEDAINAPP';
  const title = `${article.seoTitle || article.title} - ${siteName}`;
  const description = article.seoDescription || article.excerpt || article.content.replace(/<[^>]+>/g, '').substring(0, 160);
  
  let coverImg = article.coverImage || 'https://bedainnews.com/logo.png';
  if (!coverImg.startsWith('http')) {
    coverImg = `https://bedainnews.com${coverImg.startsWith('/') ? '' : '/'}${coverImg}`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bedainnews.com/article/${slug}`,
      siteName,
      images: [
        {
          url: coverImg,
          width: 1200,
          height: 630,
        }
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImg],
    },
  };
}

export default function ArticlePage() {
  // Client component will use useParams() to get the slug
  return <ArticleDetailClient />;
}

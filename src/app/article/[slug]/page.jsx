import { cache } from 'react';
import ArticleDetailClient from '../../../components/ArticleDetailClient';

const getArticleBySlug = cache(async (slug) => {
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
      // Mode hemat kuota: cache 60 detik (metadata tetap segar ≤1 menit setelah publish/edit)
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
        videoUrl: doc.videoUrl?.stringValue || '',
        youtubeUrl: doc.youtubeUrl?.stringValue || '',
        author: doc.authorName?.stringValue || doc.author?.stringValue || 'Redaksi Bedain News',
        status: doc.status?.stringValue || 'published',
        scheduledAt: doc.scheduledAt?.stringValue || '',
        publishedAt: doc.publishedAt?.timestampValue || doc.createdAt?.timestampValue || new Date().toISOString(),
        updatedAt: doc.updatedAt?.timestampValue || doc.createdAt?.timestampValue || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Error fetching article metadata:', error);
  }
  return null;
});

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const article = await getArticleBySlug(slug);

  const now = new Date();
  let scheduledDate = null;
  if (article && article.status === 'scheduled') {
    if (article.publishedAt) {
      scheduledDate = new Date(article.publishedAt);
    } else if (article.scheduledAt) {
      let s = String(article.scheduledAt).trim();
      if (!s.includes('Z') && !s.includes('+') && !s.includes('-', 10)) {
        s += '+07:00';
      }
      scheduledDate = new Date(s);
    }
  }
  const isScheduledNotYet = article && article.status === 'scheduled' && scheduledDate && scheduledDate > now;
  const isDraft = article && article.status === 'draft';

  if (!article || isDraft || isScheduledNotYet) {
    return {
      title: isScheduledNotYet ? 'Berita Belum Tayang - Bedain News' : 'Artikel Tidak Ditemukan - Bedain News',
      description: isScheduledNotYet ? 'Artikel ini telah dijadwalkan oleh redaksi dan akan tayang otomatis.' : 'Artikel yang Anda cari tidak ditemukan.',
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const siteName = 'Bedain News';
  const title = `${article.seoTitle || article.title} - ${siteName}`;
  const description = article.seoDescription || article.excerpt || article.content.replace(/<[^>]+>/g, '').substring(0, 160);
  
  let coverImg = article.coverImage || 'https://bedainnews.com/logo-bundar.png';
  if (!coverImg.startsWith('http')) {
    coverImg = `https://bedainnews.com${coverImg.startsWith('/') ? '' : '/'}${coverImg}`;
  }
  
  // Upgrade YouTube thumbnail quality so Facebook doesn't reject it for being too small
  if (coverImg.includes('hqdefault.jpg')) {
    coverImg = coverImg.replace('hqdefault.jpg', 'maxresdefault.jpg');
  }
  // Fix WhatsApp link preview by using our clean proxy URL instead of Firebase Storage
  if (coverImg.includes('firebasestorage.googleapis.com')) {
    const match = coverImg.match(/o\/(.+?)\?/);
    if (match && match[1]) {
      // Decode the path because our proxy expects unencoded slashes in [...path]
      const unencodedPath = decodeURIComponent(match[1]);
      coverImg = `https://bedainnews.com/api/og-image/${unencodedPath}`;
    }
  }

  const isVideo = (slug && slug.startsWith('yt-')) || (article && (article.category === 'Video' || article.videoUrl || article.youtubeUrl));
  const canonicalUrl = isVideo ? `https://bedainnews.com/watch/${slug}` : `https://bedainnews.com/article/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      images: [
        {
          url: coverImg,
          secureUrl: coverImg,
          width: 1200,
          height: 630,
          type: 'image/jpeg',
        }
      ],
      type: isVideo ? 'video.other' : 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImg],
    },
  };
}

import YouTubeWatchClient from '../../../components/YouTubeWatchClient';
import { redirect, permanentRedirect } from 'next/navigation';

export default async function ArticlePage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const article = await getArticleBySlug(slug);

  if ((slug && slug.startsWith('yt-')) || (article && (article.category === 'Video' || article.videoUrl || article.youtubeUrl))) {
    permanentRedirect(`/watch/${slug}`);
  }

  let schemaScript = null;
  if (article) {
    const siteName = 'Bedain News';
    const title = article.title;
    const description = article.seoDescription || article.excerpt || article.content.replace(/<[^>]+>/g, '').substring(0, 160);
    let coverImg = article.coverImage || 'https://bedainnews.com/logo-bundar.png';
    if (!coverImg.startsWith('http')) {
      coverImg = `https://bedainnews.com${coverImg.startsWith('/') ? '' : '/'}${coverImg}`;
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": title,
      "image": [coverImg],
      "datePublished": article.publishedAt,
      "dateModified": article.updatedAt,
      "author": [{
        "@type": "Person",
        "name": article.author,
        "url": "https://bedainnews.com"
      }],
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "logo": {
          "@type": "ImageObject",
          "url": "https://bedainnews.com/logo-bundar.png"
        }
      },
      "description": description
    };

    schemaScript = (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
    );
  }

  return (
    <>
      {schemaScript}
      <ArticleDetailClient initialArticle={article} />
    </>
  );
}

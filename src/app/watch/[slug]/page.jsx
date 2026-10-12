import { cache } from 'react';
import { permanentRedirect } from 'next/navigation';
import YouTubeWatchClient from '../../../components/YouTubeWatchClient';

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
      cache: 'no-store' 
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
        videoUrl: doc.videoUrl?.stringValue || doc.youtubeUrl?.stringValue || '',
        author: doc.authorName?.stringValue || doc.author?.stringValue || 'Bedain News',
        publishedAt: doc.publishedAt?.timestampValue || doc.createdAt?.timestampValue || new Date().toISOString(),
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

  if (!article) {
    return {
      title: 'Video Tidak Ditemukan - Bedain News',
      description: 'Video yang Anda cari tidak ditemukan.'
    };
  }

  const siteName = 'Bedain News';
  const title = `${article.title} - ${siteName}`;
  const description = article.seoDescription || article.excerpt || article.content.replace(/<[^>]+>/g, '').substring(0, 160);
  
  let coverImg = article.coverImage;
  
  // Try extracting YouTube thumbnail if cover image is empty
  if (!coverImg && article.videoUrl && article.videoUrl.includes('youtu')) {
    const match = article.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\n]+)/);
    if (match && match[1]) {
      coverImg = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
  }
  
  // Fallback to default logo
  if (!coverImg) {
    coverImg = 'https://bedainnews.com/logo-bundar.png';
  }

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

  return {
    title,
    description,
    alternates: {
      canonical: `https://bedainnews.com/watch/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://bedainnews.com/watch/${slug}`,
      siteName,
      images: [
        {
          url: coverImg,
          width: 1200,
          height: 630,
          type: 'image/jpeg',
        }
      ],
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImg],
    },
  };
}

export default async function WatchPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const article = await getArticleBySlug(slug);

  if (article && !slug.startsWith('yt-') && article.category !== 'Video' && !article.videoUrl && !article.youtubeUrl) {
    permanentRedirect(`/article/${slug}`);
  }

  let jsonLd = null;

  if (article) {
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt || article.content.replace(/<[^>]+>/g, '').substring(0, 160);
    
    let coverImg = article.coverImage;
    let embedUrl = article.videoUrl;
    
    if (article.videoUrl && article.videoUrl.includes('youtu')) {
      const match = article.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\n]+)/);
      if (match && match[1]) {
        const ytId = match[1];
        if (!coverImg) {
          coverImg = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }
        embedUrl = `https://www.youtube.com/embed/${ytId}`;
      }
    }

    if (!coverImg) {
      coverImg = 'https://bedainnews.com/logo-bundar.png';
    }
    if (!coverImg.startsWith('http')) {
      coverImg = `https://bedainnews.com${coverImg.startsWith('/') ? '' : '/'}${coverImg}`;
    }

    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: title,
      description: description,
      thumbnailUrl: [coverImg],
      uploadDate: article.publishedAt,
      embedUrl: embedUrl,
      publisher: {
        '@type': 'Organization',
        name: 'Bedain News',
        logo: {
          '@type': 'ImageObject',
          url: 'https://bedainnews.com/logo-bundar.png'
        }
      }
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <YouTubeWatchClient />
    </>
  );
}

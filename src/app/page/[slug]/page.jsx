import { cache } from 'react';
import StaticPageView from '../../../views/StaticPageView';
import { notFound } from 'next/navigation';

function mapFirestoreDocToPage(rawDoc, fallbackSlug) {
  if (!rawDoc || !rawDoc.fields) return null;
  const doc = rawDoc.fields;
  const id = rawDoc.name ? rawDoc.name.split('/').pop() : '';

  return {
    id,
    slug: doc.slug?.stringValue || fallbackSlug,
    title: doc.title?.stringValue || '',
    seoTitle: doc.seoTitle?.stringValue || doc.title?.stringValue || '',
    seoDescription: doc.seoDescription?.stringValue || '',
    content: doc.content?.stringValue || '',
    status: doc.status?.stringValue || 'published',
    showInFooter: doc.showInFooter?.booleanValue ?? true,
    showInSideMenu: doc.showInSideMenu?.booleanValue ?? true,
    createdAt: doc.createdAt?.timestampValue || null,
    updatedAt: doc.updatedAt?.timestampValue || null,
  };
}

const getPageBySlug = cache(async (slug) => {
  if (!slug) return null;
  const cleanSlug = String(slug).toLowerCase().trim();

  if (cleanSlug === 'faq') {
    return {
      id: 'faq',
      slug: 'faq',
      title: 'Pertanyaan Umum (FAQ) & Bantuan Pembaca',
      seoTitle: 'FAQ & Bantuan Pembaca - Bedain News',
      seoDescription: 'Temukan jawaban atas pertanyaan umum tentang cara membaca, mengirim artikel, dan berlangganan di Bedain News.',
      content: '',
      status: 'published'
    };
  }

  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/bedain-eb6a6/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'pages' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: cleanSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 60 }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].document) {
        return mapFirestoreDocToPage(data[0].document, cleanSlug);
      }
    }
  } catch (error) {
    console.error('Error fetching page metadata:', error);
  }

  return null;
});

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const page = await getPageBySlug(slug);

  if (!page || page.status !== 'published') {
    return {
      title: 'Halaman Tidak Ditemukan - Bedain News',
      robots: { index: false, follow: false }
    };
  }

  const title = `${page.seoTitle || page.title} - Bedain News`;
  const description = page.seoDescription || (page.content ? page.content.replace(/<[^>]+>/g, '').substring(0, 160) : 'Informasi resmi Bedain News');
  const canonicalUrl = `https://bedainnews.com/page/${page.slug}`;

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
      siteName: 'Bedain News',
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function Page({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const page = await getPageBySlug(slug);

  if (!page || page.status !== 'published') {
    notFound();
  }

  return <StaticPageView initialPage={page} />;
}

"use client";
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { getArticleCardImage } from '../lib/videoHelpers';

const getValidIsoString = (val) => {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') {
    try { return val.toDate().toISOString(); } catch (e) {}
  }
  if (val && typeof val.seconds === 'number') {
    try { return new Date(val.seconds * 1000).toISOString(); } catch (e) {}
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {}
  return new Date().toISOString();
};

const SEO = ({ title, description, image, url, type = 'website', articleData = null }) => {
  const { settings, loading } = useSiteSettings();

  const siteName = settings?.siteName || 'Bedain News';
  const siteTagline = settings?.tagline || 'Portal Berita Terpercaya';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bedainnews.com';
  
  const defaultTitle = `${siteName} - ${siteTagline}`;
  const seoTitle = title ? `${title} - ${siteName}` : (settings?.seoDefaultTitle || defaultTitle);
  
  const seoDescription = description || settings?.seoDefaultDescription || siteTagline;
  const resolvedArticleImage = articleData ? getArticleCardImage(articleData) : null;
  const seoImage = image || resolvedArticleImage || settings?.seoDefaultImage || settings?.logoUrl || '/logo.png';
  const seoUrl = url || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');

  useEffect(() => {
    if (typeof document !== 'undefined' && seoTitle) {
      document.title = seoTitle;
    }
  }, [seoTitle]);

  useEffect(() => {
    if (typeof document !== 'undefined' && settings?.faviconUrl) {
      const favicon = document.getElementById('app-favicon');
      if (favicon) {
        favicon.href = settings.faviconUrl;
      }
      const appleFavicon = document.getElementById('app-apple-favicon');
      if (appleFavicon) {
        appleFavicon.href = settings.faviconUrl;
      }
    }
  }, [settings?.faviconUrl]);

  // Build JSON-LD for NewsArticle & BreadcrumbList if articleData is provided
  const buildJsonLd = () => {
    if (!articleData) return null;

    const publishedDate = getValidIsoString(articleData.publishedAt);
    const modifiedDate = articleData.updatedAt ? getValidIsoString(articleData.updatedAt) : publishedDate;

    const logoUrl = settings?.logoUrl || `${siteUrl}/logo.png`;
    const absoluteLogoUrl = typeof logoUrl === 'string' && logoUrl.startsWith('http') ? logoUrl : `${siteUrl}${typeof logoUrl === 'string' && logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
    const articleUrl = `${siteUrl}/article/${articleData.slug || articleData.id}`;
    const rawArticleImage = resolvedArticleImage || articleData.coverImage || articleData.imageUrl || absoluteLogoUrl;
    const articleImage = typeof rawArticleImage === 'string' && rawArticleImage.startsWith('http') ? rawArticleImage : `${siteUrl}${typeof rawArticleImage === 'string' && rawArticleImage.startsWith('/') ? '' : '/'}${rawArticleImage}`;

    const authorName = typeof articleData.author === 'object' 
      ? (articleData.author?.name || "Redaksi Bedain") 
      : (articleData.author || articleData.authorName || "Redaksi Bedain");

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": (articleData.title || "").substring(0, 110),
      "description": articleData.seoDescription || articleData.excerpt || seoDescription,
      "image": [articleImage],
      "datePublished": publishedDate,
      "dateModified": modifiedDate,
      "url": articleUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleUrl
      },
      "isAccessibleForFree": true,
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": typeof articleData.author === 'object' && articleData.author?.url ? articleData.author.url : `${siteUrl}/page/redaksi`
      },
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "logo": {
          "@type": "ImageObject",
          "url": absoluteLogoUrl,
          "width": 600,
          "height": 60
        }
      },
      "articleSection": articleData.category || "Berita",
      "keywords": articleData.tags || articleData.category || "",
      "inLanguage": "id-ID"
    };

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Beranda",
          "item": `${siteUrl}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": articleData.category || "Berita",
          "item": `${siteUrl}/cari?q=${encodeURIComponent(articleData.category || 'Berita')}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": articleData.title,
          "item": articleUrl
        }
      ]
    };

    return JSON.stringify([schema, breadcrumb]);
  };

  // Build WebSite JSON-LD for non-article pages (enables Google Sitelinks Search)
  const buildWebSiteJsonLd = () => {
    if (articleData) return null; // Only on homepage/non-article pages
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "url": siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteUrl}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };
    return JSON.stringify(schema);
  };

  const jsonLdScript = buildJsonLd();
  const webSiteJsonLd = buildWebSiteJsonLd();

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {settings?.faviconUrl && <link rel="icon" href={settings.faviconUrl} />}
      {settings?.faviconUrl && <link rel="apple-touch-icon" href={settings.faviconUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:site_name" content={siteName} />
      {seoImage && <meta property="og:image" content={seoImage} />}
      {articleData && <meta property="og:image:width" content="1200" />}
      {articleData && <meta property="og:image:height" content="630" />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seoUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {seoImage && <meta name="twitter:image" content={seoImage} />}

      {/* Article-specific meta tags */}
      {articleData?.publishedAt && (
        <meta property="article:published_time" content={getValidIsoString(articleData.publishedAt)} />
      )}
      {articleData?.category && <meta property="article:section" content={articleData.category} />}
      {articleData?.tags && <meta property="article:tag" content={articleData.tags} />}

      {/* JSON-LD Structured Data for Google News */}
      {jsonLdScript && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript }} />
      )}

      {/* JSON-LD WebSite Schema for Google Sitelinks */}
      {webSiteJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webSiteJsonLd }} />
      )}
    </Helmet>
  );
};

export default SEO;

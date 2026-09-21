"use client";
import React from 'react';
import Link from 'next/link';
const LatestNews = ({ articles, loading }) => {
  // Fallback data yang persis seperti Gambar 1
  const fallbackMain = {
    id: 'spotlight-main',
    title: 'Ngeri, Kaki Lansia di Brebes Putus Usai Jadi Korban Tabrak Lari Pemotor',
    meta: 'detikNews | 15 menit yang lalu',
    coverImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80',
    slug: 'kaki-lansia-brebes-putus-tabrak-lari'
  };

  const fallbackRelated = [
    {
      id: 'spotlight-rel-1',
      title: 'Truk Terperosok di Depan RS Sutoyo Jaksel, Lalin Macet',
      slug: 'truk-terperosok-depan-rs-sutoyo-jaksel'
    },
    {
      id: 'spotlight-rel-2',
      title: 'Anggota DPR Peringatkan KBIHU Jabar Sebut Jemaah Haji Lansia Bikin Repot',
      slug: 'dpr-peringatkan-kbihu-jabar-haji-lansia'
    }
  ];

  const mainArticle = (articles && articles.length > 0) ? (articles.find(a => a.isHeadline) || articles[0]) : fallbackMain;
  const relatedArticles = (articles && articles.length > 2) 
    ? articles.filter(a => a.id !== mainArticle?.id).slice(0, 2) 
    : fallbackRelated;

  const getMetaText = (article) => {
    if (article.meta) return article.meta;
    const author = article.author?.name || 'detikNews';
    const time = article.publishedAt?.toDate ? article.publishedAt.toDate().toLocaleDateString('id-ID') : 'Baru saja';
    return `${author} | ${time}`;
  };

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <section className="recap-section">
        <div className="recap-main">
          <div className="recap-image skeleton-pulse" style={{ height: '380px', borderRadius: 'var(--radius-lg)', pointerEvents: 'none' }} />
          <div className="recap-related" style={{ pointerEvents: 'none' }}>
            <div className="related-header">
              <h3>Berita Terkait</h3>
              <div className="related-line"></div>
            </div>
            <div className="related-grid">
              <div className="skeleton-pulse" style={{ height: '54px', borderRadius: '8px' }} />
              <div className="skeleton-pulse" style={{ height: '54px', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="recap-section">
      <div className="recap-main">
        <Link href={`/article/${getSlug(mainArticle)}`} style={{ display: 'block', textDecoration: 'none' }}>
          <div className="recap-image">
            <img src={mainArticle.coverImage || fallbackMain.coverImage} alt={mainArticle.title} fetchPriority="high" decoding="async" />
            <div className="recap-overlay">
              <h2 className="recap-title">{mainArticle.title}</h2>
              <div className="recap-meta">{getMetaText(mainArticle)}</div>
            </div>
          </div>
        </Link>
        
        <div className="recap-related">
          <div className="related-header">
            <h3>Berita Terkait</h3>
            <div className="related-line"></div>
          </div>
          <div className="related-grid">
            {relatedArticles.map((article, idx) => (
              <Link key={article.id || idx} href={`/article/${getSlug(article)}`} className="related-item">{article.title}</Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestNews;

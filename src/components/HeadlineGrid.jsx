"use client";
import React from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { getArticleCardImage } from '../lib/videoHelpers';
import VideoBadge from './VideoBadge';

const HeadlineGrid = ({ articles, loading }) => {
  const fallbackHeadlines = [
    {
      id: 'fallback-1',
      title: 'Respons Warga soal JHT Dikenai Pajak',
      slug: 'respons-warga-soal-jht-dikenai-pajak',
      img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-2',
      title: 'Polisi Sita Rp 67,2 Miliar di Kafe de\'Clan – Money Changer',
      slug: 'polisi-sita-rp-67-miliar-kafe-declan',
      img: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-3',
      title: 'Geger Pemakaman di Pekarangan Diprotes Tetangga',
      slug: 'geger-pemakaman-di-pekarangan-diprotes',
      img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-4',
      title: 'Brankas di Kafe Berisi Uang dalam Jumlah Besar',
      slug: 'brankas-di-kafe-berisi-uang-besar',
      img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-5',
      title: 'Sekjen Kementerian Pastikan Keluarga Menteri PU Ikut ke AS Tak Pakai APBN',
      slug: 'sekjen-kementerian-pastikan-keluarga-menteri-pu-as',
      img: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-6',
      title: 'Empat BUMN Asset Management Resmi Merger Menjadi Raksasa Baru',
      slug: 'empat-bumn-asset-management-resmi-merger',
      img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'fallback-7',
      title: 'Siapa Bisa Jebol Spanyol? Prediksi Final Piala Eropa',
      slug: 'siapa-bisa-jebol-spanyol-prediksi',
      img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80'
    }
  ];

  const headlineItems = (articles && articles.length >= 4) ? articles.slice(0, 8) : fallbackHeadlines;

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const swipeContainerRef = React.useRef(null);

  React.useEffect(() => {
    const container = swipeContainerRef.current;
    if (!container) return;

    const interval = setInterval(() => {
      // Card width is 130px + 6px gap = 136px
      const cardWidth = 136;
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: cardWidth, behavior: 'smooth' });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [headlineItems]);

  if (loading) {
    return (
      <>
        {/* Desktop Skeleton */}
        <section className="headline-row desktop-only-headline">
          {[...Array(5)].map((_, index) => (
            <article key={index} className="article-card small-card" style={{ pointerEvents: 'none' }}>
              <div className="img-wrapper skeleton-pulse" style={{ aspectRatio: '16/10', borderRadius: 'var(--radius-md)', marginBottom: '10px' }} />
              <div className="skeleton-pulse" style={{ height: '16px', width: '90%', borderRadius: '4px', marginBottom: '6px' }} />
              <div className="skeleton-pulse" style={{ height: '16px', width: '60%', borderRadius: '4px' }} />
            </article>
          ))}
        </section>

        {/* Mobile Skeleton */}
        <section className="headline-stories-section mobile-only-headline">
          <div className="headline-swipe-container">
            {[...Array(4)].map((_, index) => (
              <article key={index} className="story-card-item skeleton-pulse" style={{ pointerEvents: 'none', borderRadius: '16px', minWidth: '160px', height: '240px' }} />
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Desktop View: Classic 5-Column Grid */}
      <section className="headline-row desktop-only-headline">
        {headlineItems.slice(0, 5).map((item, index) => {
          const itemSlug = getSlug(item);
          const itemImg = getArticleCardImage(item);

          return (
            <Link key={item.id || index} href={`/article/${itemSlug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <article className="article-card small-card">
                <div className="img-wrapper" style={{ position: 'relative' }}>
                  <LazyImage 
                    src={itemImg} 
                    alt={item.title} 
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                  <VideoBadge article={item} />
                </div>
                <h3 className="card-title">{item.title}</h3>
              </article>
            </Link>
          );
        })}
      </section>

      {/* Mobile View: Vertical Shorts / Story Cards (Persis seperti Gambar 2) */}
      <section className="headline-stories-section mobile-only-headline">
        <div className="headline-swipe-container" ref={swipeContainerRef}>
          {headlineItems.map((item, index) => {
            const itemSlug = getSlug(item);
            const itemImg = getArticleCardImage(item);
            const badgeText = index === 0 ? 'TOPIK\nHANGAT' : 'TERKINI';
            const dateText = item.date || '8 Juli 2026';

            return (
              <Link key={item.id || index} 
                href={`/article/${itemSlug}`} 
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                className="story-card-link"
              >
                <article className="story-card-item" style={{ position: 'relative' }}>
                  <LazyImage 
                    src={itemImg} 
                    alt={item.title} 
                    className="story-card-img"
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                  <div className="story-card-gradient" />
                  <VideoBadge article={item} />

                  {/* Top Left Badge (BREAKING NEWS / TERKINI) */}
                  <div className="story-badge">
                    {badgeText}
                  </div>

                  {/* Top Right Play Circle */}
                  <div className="story-play-circle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#111827">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>

                  {/* Bottom White Title Box with Left Red Accent Bar */}
                  <div className="story-title-box">
                    <h3 className="story-title-text">{item.title}</h3>
                  </div>

                  {/* Date below title box */}
                  <div className="story-date-text">
                    📅 {dateText}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default HeadlineGrid;

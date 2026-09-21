"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { getArticleCardImage } from '../lib/videoHelpers';
import VideoBadge from './VideoBadge';

const MoreNewsGrid = ({ articles, loading }) => {
  const scrollRef = useRef(null);
  
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const interval = setInterval(() => {
      const scrollAmount = 236; // approximate card width + gap
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [articles]);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="visual-stories-container">
        <div className="visual-stories-scroll">
          {[...Array(5)].map((_, index) => (
            <article key={index} className="story-card skeleton-pulse" style={{ pointerEvents: 'none', minWidth: '220px', height: '300px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  const displayItems = articles.slice(0, 8).map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug || a.id,
        category: a.category || 'Berita',
        icon: (a.category || 'P')[0].toUpperCase(),
        count: '10+ Konten',
        img: getArticleCardImage(a),
        original: a
  }));

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="visual-stories-container">
      <div className="visual-stories-scroll" ref={scrollRef}>
        {displayItems.map((item) => (
          <Link key={item.id} href={`/article/${getSlug(item)}`} style={{ textDecoration: 'none', display: 'block' }}>
            <article className="story-card" style={{ position: 'relative' }}>
              <LazyImage src={item.img} alt={item.title} className="story-img" />
              <VideoBadge article={item.original} />
              <div className="story-overlay" style={{ background: 'transparent' }}>
                <h3 className="story-title" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>{item.title}</h3>
              </div>
            </article>
          </Link>
        ))}
      </div>
      <button className="story-scroll-btn" onClick={scrollRight} aria-label="Scroll right">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M9.59 16.59L14.17 12 9.59 7.41 11 6l6 6-6 6z" />
        </svg>
      </button>
    </div>
  );
};

export default MoreNewsGrid;

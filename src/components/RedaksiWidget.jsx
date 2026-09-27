"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getArticleCardImage } from '../lib/videoHelpers';

const RedaksiWidget = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchRedaksi = async () => {
      try {
        // Query latest articles and filter in JS to avoid ANY composite index issues
        const q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q);
        
        let fetched = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => a.status === 'published' && a.category && a.category.toLowerCase().includes('redaksi'));
          
        fetched = fetched.slice(0, 6);
        
        if (fetched.length === 0) {
          fetched = [
            { id: '1', title: 'Pakai Setrika Uap Portabel Tapi Baju Tetep Kusut? Ini 6 Cara Pakai yang Benar', category: 'Home & Living', img: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&q=80', slug: '#' },
            { id: '2', title: 'Capek Lipstik Matte Bikin Bibir Pecah? Coba Lip Color dengan Kandungan Serum', category: 'Perawatan & Kecantikan', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', slug: '#' },
            { id: '3', title: 'Rekomendasi Sepatu Olahraga Terbaik untuk Pemula yang Ingin Mulai Lari', category: 'Gaya Hidup', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', slug: '#' },
            { id: '4', title: '5 Skincare Lokal Murah Meriah yang Ampuh Mencerahkan Wajah Kusam', category: 'Perawatan & Kecantikan', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80', slug: '#' },
          ];
        } else {
          fetched = fetched.map(a => ({
            ...a,
            img: getArticleCardImage(a)
          }));
        }

        if (isMounted) {
          setArticles(fetched);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching redaksi articles:", err);
        if (isMounted) {
          setArticles([
            { id: '1', title: 'Pakai Setrika Uap Portabel Tapi Baju Tetep Kusut? Ini 6 Cara Pakai yang Benar', category: 'Home & Living', img: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&q=80', slug: '#' },
            { id: '2', title: 'Capek Lipstik Matte Bikin Bibir Pecah? Coba Lip Color dengan Kandungan Serum', category: 'Perawatan & Kecantikan', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', slug: '#' },
            { id: '3', title: 'Rekomendasi Sepatu Olahraga Terbaik untuk Pemula yang Ingin Mulai Lari', category: 'Gaya Hidup', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', slug: '#' },
            { id: '4', title: '5 Skincare Lokal Murah Meriah yang Ampuh Mencerahkan Wajah Kusam', category: 'Perawatan & Kecantikan', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80', slug: '#' },
          ]);
          setLoading(false);
        }
      }
    };
    fetchRedaksi();
    return () => { isMounted = false; };
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const clientWidth = scrollRef.current.clientWidth;
    // Calculate which item is most visible (roughly)
    const index = Math.round(scrollLeft / (clientWidth / 2));
    setActiveIndex(Math.min(index, articles.length - 1));
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (loading || articles.length === 0) return null;

  return (
    <div className="redaksi-widget">
      {/* Top Header / Logo */}
      <div className="redaksi-header">
        <div className="redaksi-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-text-primary)" style={{marginRight: '6px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
          Meja Redaksi
        </div>
      </div>

      {/* Sub Header Box */}
      <div className="redaksi-sub-box">
        <div className="redaksi-sub-text">Pilihan Artikel Terbaik dari Redaksi Kami</div>
        <Link href="/cari?q=Meja%20Redaksi" className="redaksi-btn-more">
          Selengkapnya
        </Link>
      </div>

      {/* Carousel Section */}
      <div className="redaksi-carousel-container">
        <button className="redaksi-nav-btn left" onClick={scrollLeft} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        
        <div className="redaksi-scroll" ref={scrollRef} onScroll={handleScroll}>
          {articles.map((item, index) => {
            const slug = item.slug && item.slug !== '#' ? item.slug : item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return (
              <Link key={item.id || index} href={`/article/${slug}`} style={{ textDecoration: 'none' }} className="redaksi-card-link">
                <article className="redaksi-card">
                  <div className="redaksi-img-wrap">
                    <LazyImage src={item.img || item.coverImage} alt={item.title} />
                  </div>
                  <div className="redaksi-content">
                    <span className="redaksi-cat">{item.category || 'Meja Redaksi'}</span>
                    <h4 className="redaksi-title">{item.title}</h4>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        <button className="redaksi-nav-btn right" onClick={scrollRight} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="redaksi-dots">
        {articles.slice(0, articles.length - 1).map((_, i) => (
          <span key={i} className={`redaksi-dot ${i === activeIndex || (i === articles.length - 2 && activeIndex === articles.length - 1) ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
};

export default RedaksiWidget;

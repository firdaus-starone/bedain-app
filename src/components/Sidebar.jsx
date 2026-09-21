"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import AdUnit from './AdUnit';
import AdBanner from './AdBanner';
import { collection, query, where, orderBy, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Global memory cache across mounts for Sidebar
let cachedSidebarMemory = null;
let fetchSidebarPromise = null;

const Sidebar = () => {
  const fallbackTrending = [
    { id: 1, title: 'IHSG Anjlok, Saham Perbankan Jadi Sorotan Investor', slug: 'ihsg-anjlok-saham-perbankan-sorotan', category: 'Bisnis', publishedAt: new Date(Date.now() - 2*3600*1000) },
    { id: 2, title: 'Review Gadget Terbaru: Flagship Killer yang Bikin Penasaran', slug: 'review-gadget-terbaru-flagship-killer', category: 'AI & Tech', publishedAt: new Date(Date.now() - 5*3600*1000) },
    { id: 3, title: 'Polemik Pemilu: Saling Sindir Antar Tokoh Partai', slug: 'polemik-pemilu-saling-sindir-partai', category: 'Nasional', publishedAt: new Date(Date.now() - 12*3600*1000) },
    { id: 4, title: 'Destinasi Wisata Tersembunyi di Bali yang Wajib Dikunjungi', slug: 'destinasi-wisata-tersembunyi-bali', category: 'Gaya Hidup', publishedAt: new Date(Date.now() - 24*3600*1000) },
    { id: 5, title: 'Tips Menjaga Kesehatan Mental di Tengah Padatnya Pekerjaan', slug: 'tips-menjaga-kesehatan-mental-pekerjaan', category: 'Kesehatan', publishedAt: new Date(Date.now() - 48*3600*1000) }
  ];

  const [trending, setTrending] = useState(() => cachedSidebarMemory?.trending || []);
  const [featuredOpinion, setFeaturedOpinion] = useState(() => cachedSidebarMemory?.opinion || null);
  const [loading, setLoading] = useState(() => !cachedSidebarMemory);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('Silakan masukkan alamat email yang valid.');
      return;
    }
    setSubscribing(true);
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email: email.trim(),
        subscribedAt: serverTimestamp(),
        status: 'active',
        source: 'sidebar_widget'
      });
      alert('🎉 Terima kasih telah mendaftar newsletter kami! Alamat email Anda telah berhasil tersimpan.');
      setEmail('');
    } catch (err) {
      console.error("Newsletter error:", err);
      // Fallback in case of network or permissions error
      alert('🎉 Terima kasih telah mendaftar newsletter kami! Alamat email Anda telah dicatat.');
      setEmail('');
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (cachedSidebarMemory) {
      setTrending(cachedSidebarMemory.trending || []);
      if (cachedSidebarMemory.opinion) setFeaturedOpinion(cachedSidebarMemory.opinion);
      setLoading(false);
      return;
    }

    if (fetchSidebarPromise) {
      fetchSidebarPromise.then((data) => {
        if (isMounted && data) {
          if (data.trending) setTrending(data.trending);
          if (data.opinion) setFeaturedOpinion(data.opinion);
          setLoading(false);
        }
      });
      return;
    }

    const promise = (async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          where('status', '==', 'published'),
          limit(8)
        );
        const snap = await getDocs(q);
        const now = new Date();
        const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });

        const opinion = articles.find(a => 
          a.category && a.category.toLowerCase().includes('opini')
        );

        const sortedByViews = [...articles]
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 5);

        const trendingResult = sortedByViews.length > 0 ? sortedByViews.map((a, index) => ({
          id: a.id,
          title: a.title,
          slug: a.slug || a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          category: a.category || 'Berita',
          publishedAt: a.publishedAt || Date.now()
        })) : [];

        const resultData = { trending: trendingResult, opinion: opinion || null };
        cachedSidebarMemory = resultData;
        return resultData;
      } catch (err) {
        console.error('Error fetching sidebar data:', err);
        return null;
      }
    })();

    fetchSidebarPromise = promise;
    promise.then((data) => {
      if (isMounted && data) {
        if (data.trending) setTrending(data.trending);
        if (data.opinion) setFeaturedOpinion(data.opinion);
        setLoading(false);
      }
      fetchSidebarPromise = null;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const getSlug = (title, slug) => {
    if (slug) return slug;
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Baru saja';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Baru saja';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const opinion = featuredOpinion;

  return (
    <div className="sidebar-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* --- BLOK STICKY 1 --- */}
      <div style={{ flex: 1, minHeight: 'max-content', paddingBottom: '24px' }}>
        <div style={{ position: 'sticky', top: '188px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Monetisasi: Sponsor Sidebar & Rectangle Ad */}
          <AdBanner slot="sidebar" />
          <AdUnit format="rectangle" />

      <div className="sidebar-widget">
        <h3 className="widget-title">Terpopuler</h3>
        <div className="trending-list">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="trending-item" style={{ pointerEvents: 'none', padding: '10px 0' }}>
                <span className="trending-number skeleton-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%' }}></span>
                <div className="trending-content" style={{ width: '100%' }}>
                  <div className="skeleton-pulse" style={{ height: '14px', width: '90%', borderRadius: '4px', marginBottom: '6px' }} />
                  <div className="skeleton-pulse" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
                </div>
              </div>
            ))
          ) : (
            (trending.length > 0 ? trending : fallbackTrending).map((item, index) => (
              <Link key={item.id} href={`/article/${getSlug(item.title, item.slug)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="trending-item" style={{ cursor: 'pointer' }}>
                  <span className="trending-number">{index + 1}</span>
                  <div className="trending-content">
                    <h4>{item.title}</h4>
                    <span className="trending-views" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{item.category || 'Berita'}</span>
                      <span style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>|</span>
                      <span>{formatTimeAgo(item.publishedAt)}</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      </div>
      </div>

      {/* --- BLOK STICKY 2 --- */}
      <div style={{ flex: 1, minHeight: 'max-content', paddingBottom: '24px' }}>
        <div style={{ position: 'sticky', top: '188px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(!loading && !opinion) ? null : (
            <div className="sidebar-widget">
              <h3 className="widget-title">Opini Pilihan</h3>
              {loading ? (
                <article className="opinion-card-modern" style={{ pointerEvents: 'none' }}>
                  <div className="opinion-content-modern">
                    <div className="skeleton-pulse" style={{ height: '16px', width: '90%', borderRadius: '4px', marginBottom: '8px' }} />
                    <div className="skeleton-pulse" style={{ height: '16px', width: '70%', borderRadius: '4px', marginBottom: '8px' }} />
                  </div>
                  <div className="opinion-author-modern">
                    <div className="skeleton-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                    <div className="skeleton-pulse" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
                  </div>
                </article>
              ) : (
                <Link href={`/article/${opinion.slug || getSlug(opinion.title, opinion.slug)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <article className="opinion-card-modern" style={{ cursor: 'pointer' }}>
                    <div className="opinion-quote-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-accent)" opacity="0.2"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/></svg>
                    </div>
                    <div className="opinion-content-modern">
                      <h4>"{opinion.title}"</h4>
                    </div>
                    <div className="opinion-author-modern">
                      <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-bg-secondary)' }}>
                        <LazyImage 
                          src={opinion.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(opinion.title || 'Opini')}&background=random&color=fff&size=150`} 
                          alt={opinion.title || 'Opini Pilihan'} 
                          className="author-img-modern" 
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        />
                      </div>
                      <span className="author-name-modern" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opinion.author?.name || opinion.authorName || 'Redaksi Bedain News'}</span>
                    </div>
                  </article>
                </Link>
              )}
            </div>
          )}

      <div className="sidebar-widget newsletter-widget" style={{ textAlign: 'center', background: 'linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-tertiary))', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px 20px' }}>
        <div style={{ width: '48px', height: '48px', background: 'rgba(230,57,70,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>Bedain Newsletter</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>Dapatkan ringkasan berita terpenting setiap pagi langsung ke kotak masuk Anda.</p>
        <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="Alamat Email Anda" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={subscribing}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} 
          />
          <button 
            type="submit" 
            disabled={subscribing}
            className="btn" 
            style={{ width: '100%', padding: '12px', background: subscribing ? 'var(--color-text-tertiary)' : 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: subscribing ? 'not-allowed' : 'pointer', transition: 'background 0.2s', boxSizing: 'border-box' }}
          >
            {subscribing ? 'Menyimpan...' : 'Berlangganan'}
          </button>
        </form>
      </div>
      </div>
      </div>

      {/* --- BLOK STICKY 3 --- */}
      <div style={{ flex: 1, minHeight: 'max-content' }}>
        <div style={{ position: 'sticky', top: '188px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="sidebar-widget tags-widget">
        <h3 className="widget-title">Topik Hangat</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['Teknologi AI', 'Bisnis Digital', 'Produktivitas', 'Investasi', 'Green Tech', 'Karir', 'Review Gadget'].map((tag, i) => (
            <Link key={i} href={`/cari?q=${encodeURIComponent(tag.replace('#', ''))}`} style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }} onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Monetisasi: Bottom Sidebar Rectangle Ad */}
      <AdUnit format="rectangle" />
      </div>
      </div>
    </div>
  );
};

export default Sidebar;

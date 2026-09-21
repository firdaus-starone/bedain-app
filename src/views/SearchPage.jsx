import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import LazyImage from '../components/LazyImage';
import { getArticleCardImage } from '../lib/videoHelpers';
import VideoBadge from '../components/VideoBadge';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { Search, Calendar, Eye, ArrowRight, Flame, Filter, SlidersHorizontal, Sparkles, Tag } from 'lucide-react';

const SearchPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams ? searchParams.get('q') || '' : '';
  const [searchInput, setSearchInput] = useState(queryParam);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Smart Search Tabs & Sorting
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Semua');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'popular'

  // Infinite Scroll State
  const [displayCount, setDisplayCount] = useState(12);
  const observerTarget = React.useRef(null);

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const fetchAllArticles = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'articles'));
        const now = new Date();
        const fbArticles = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate().toISOString() : (a.publishedAt || new Date().toISOString()); return new Date(p) <= now; });
        setArticles(fbArticles);
      } catch (err) {
        console.error('Error fetching articles for search:', err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllArticles();
  }, []);

  const searchResults = useMemo(() => {
    const q = queryParam.trim().toLowerCase();
    
    // Base filter by query string
    let filtered = articles;
    if (q && q !== 'semua' && q !== 'all') {
      filtered = articles.filter(article => {
        const titleMatch = (article.title || '').toLowerCase().includes(q);
        const excerptMatch = (article.seoDescription || article.excerpt || '').toLowerCase().includes(q);
        const contentMatch = (article.content || '').toLowerCase().includes(q);
        const categoryMatch = (article.category || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(article.tags) && article.tags.some(tag => tag.toLowerCase().includes(q));

        // Smart mapping for category queries
        let smartMatch = false;
        if (q.includes('teknologi') || q.includes('ai')) {
          smartMatch = (article.category || '').toLowerCase().includes('teknologi') || (article.category || '').toLowerCase().includes('ai');
        } else if (q.includes('finansial') || q.includes('ekonomi')) {
          smartMatch = (article.category || '').toLowerCase().includes('finansial') || (article.category || '').toLowerCase().includes('ekonomi');
        } else if (q.includes('hiburan') || q.includes('viral')) {
          smartMatch = (article.category || '').toLowerCase().includes('hiburan') || (article.category || '').toLowerCase().includes('pop');
        } else if (q.includes('gaya') || q.includes('wellness') || q.includes('health')) {
          smartMatch = (article.category || '').toLowerCase().includes('gaya') || (article.category || '').toLowerCase().includes('health');
        } else if (q.includes('politik') || q.includes('kebijakan')) {
          smartMatch = (article.category || '').toLowerCase().includes('politik') || (article.category || '').toLowerCase().includes('nasional');
        } else if (q === 'video' || q.includes('20detik')) {
          smartMatch = (article.title || '').toLowerCase().includes('video') || 
                       (article.category || '').toLowerCase().includes('hiburan') || 
                       (article.category || '').toLowerCase().includes('pop') ||
                       (article.title || '').toLowerCase().includes('film') ||
                       (article.title || '').toLowerCase().includes('musik');
        }

        return titleMatch || excerptMatch || contentMatch || categoryMatch || tagsMatch || smartMatch;
      });
    }

    // Filter by Active Category Tab
    if (activeCategoryFilter !== 'Semua') {
      filtered = filtered.filter(a => {
        const cat = (a.category || '').toLowerCase();
        if (activeCategoryFilter === 'Nasional') return cat.includes('nasional') || cat.includes('politik') || cat.includes('hukum');
        if (activeCategoryFilter === 'Bisnis & Finansial') return cat.includes('bisnis') || cat.includes('finansial') || cat.includes('ekonomi');
        if (activeCategoryFilter === 'Teknologi & AI') return cat.includes('teknologi') || cat.includes('ai') || cat.includes('gadget') || cat.includes('tekno');
        if (activeCategoryFilter === 'Hiburan & Pop') return cat.includes('hiburan') || cat.includes('pop') || cat.includes('viral') || cat.includes('seleb');
        if (activeCategoryFilter === 'Gaya Hidup') return cat.includes('gaya') || cat.includes('health') || cat.includes('wellness');
        return cat.includes(activeCategoryFilter.toLowerCase());
      });
    }

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'popular') {
        const viewsA = a.views || 0;
        const viewsB = b.views || 0;
        return viewsB - viewsA;
      } else {
        const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : new Date(a.publishedAt || a.createdAt || 0).getTime();
        const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : new Date(b.publishedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
    });
  }, [articles, queryParam, activeCategoryFilter, sortBy]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget.current, searchResults]);

  // Reset display count when query/filter/sort changes
  useEffect(() => {
    setDisplayCount(12);
  }, [queryParam, activeCategoryFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/cari?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'Baru saja';
    if (dateObj.toDate) return dateObj.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return new Date(dateObj).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const trendingTags = ['AI & Teknologi', 'Finansial Digital', 'Berita Viral', 'Politik Nasional', 'Video 20Detik', 'Gaya Hidup & Wellness'];
  const categoryTabs = ['Semua', 'Nasional', 'Bisnis & Finansial', 'Teknologi & AI', 'Hiburan & Pop', 'Gaya Hidup'];

  return (
    <div className="app-container">
      <SEO 
        title={queryParam ? `Hasil Pencarian: ${queryParam} - Bedain News` : 'Pusat Pencarian Berita Cerdas - Bedain News'}
        description={`Cari berita terbaru dan teraktual mengenai ${queryParam || 'berbagai topik hangat'} di Bedain News.`}
      />
      <Navbar />

      <main className="container" style={{ padding: '36px 0', minHeight: '70vh' }}>
        {/* Search Header Banner */}
        <div className="search-page-header" style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '20px',
          padding: '34px',
          marginBottom: '32px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-accent)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={13} /> PUSAT PENCARIAN CERDAS
            </span>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontFamily: 'var(--font-heading)',
            marginBottom: '20px',
            color: 'var(--color-text-primary)',
            lineHeight: 1.25
          }}>
            {queryParam ? (
              queryParam.toLowerCase() === 'semua' ? (
                'Arsip Semua Berita & Artikel'
              ) : (
                <>Hasil Pencarian untuk: <span style={{ color: 'var(--color-accent)' }}>"{queryParam}"</span></>
              )
            ) : (
              'Temukan Berita & Wawasan Teraktual'
            )}
          </h1>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', maxWidth: '680px', marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '14px',
              padding: '0 16px',
              transition: 'border-color 0.2s'
            }}>
              <Search size={20} style={{ color: 'var(--color-text-secondary)', marginRight: '12px' }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ketik kata kunci (contoh: kecerdasan buatan, ekonomi, viral)..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '14px 0',
                  width: '100%',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '0 28px',
                fontWeight: 700,
                fontSize: '0.96rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
              }}
            >
              Cari
            </button>
          </form>

          {/* Trending Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} color="var(--color-accent)" /> Topik Hangat:
            </span>
            {trendingTags.map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`/cari?q=${encodeURIComponent(tag)}`)}
                style={{
                  background: queryParam === tag ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: queryParam === tag ? '#fff' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs & Sorting Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
            {categoryTabs.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                style={{
                  background: activeCategoryFilter === cat ? 'var(--color-text-primary)' : 'var(--color-bg-secondary)',
                  color: activeCategoryFilter === cat ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '8px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <SlidersHorizontal size={14} /> Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="newest">🕒 Terbaru</option>
              <option value="popular">🔥 Terpopuler (Banyak Dilihat)</option>
            </select>
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Memuat hasil pencarian cerdas...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div style={{ marginBottom: '16px', fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
              Menampilkan <strong>{searchResults.length}</strong> berita
              {activeCategoryFilter !== 'Semua' && ` di kategori ${activeCategoryFilter}`}
              {queryParam && ` untuk "${queryParam}"`}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '24px'
            }}>
              {searchResults.slice(0, displayCount).map((article, idx) => (
                <Link key={article.id || idx}
                  href={`/article/${getSlug(article)}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
                  }}
                  className="search-result-card"
                >
                  <div style={{ position: 'relative', height: '200px', overflow: 'hidden', background: 'var(--color-bg-tertiary)' }}>
                    <LazyImage
                      src={getArticleCardImage(article)}
                      alt={article.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease'
                      }}
                    />
                    <VideoBadge article={article} />
                    {article.category && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: 'var(--color-accent)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {article.category}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{
                      fontSize: '1.14rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.4,
                      marginBottom: '10px'
                    }}>
                      {article.title}
                    </h3>
                    {(article.seoDescription || article.excerpt) && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '18px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {article.seoDescription || article.excerpt}
                      </p>
                    )}
                    <div style={{
                      marginTop: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '14px'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Calendar size={14} />
                        {formatDate(article.publishedAt || article.createdAt)}
                      </span>
                      {article.views !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Eye size={14} /> {article.views}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Infinite Scroll Trigger */}
            {displayCount < searchResults.length && (
              <div ref={observerTarget} style={{ textAlign: 'center', padding: '48px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Memuat lebih banyak berita...</span>
              </div>
            )}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '70px 24px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <Search size={54} style={{ color: 'var(--color-text-secondary)', margin: '0 auto 18px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.35rem', color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              Tidak Menemukan Hasil untuk "{queryParam}"
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0 auto 24px', fontSize: '0.94rem', lineHeight: 1.5 }}>
              Coba gunakan kata kunci lain, periksa kembali ejaan, atau pilih salah satu topik terhangat di bawah ini.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {trendingTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => router.push(`/cari?q=${encodeURIComponent(tag)}`)}
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer'
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;

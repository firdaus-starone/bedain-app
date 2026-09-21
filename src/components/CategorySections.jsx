"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { getArticleCardImage } from '../lib/videoHelpers';
import VideoBadge from './VideoBadge';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Global memory cache across CategorySections instances
let cachedCategories = null;
let categoriesPromise = null;
const categoryArticlesCache = new Map();

const CategorySections = ({ startIndex = 0, endIndex = undefined }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCategoriesAndArticles = async () => {
      try {
        // Fetch categories (cached globally across multiple instances on the page)
        let cats = cachedCategories;
        if (!cats) {
          if (categoriesPromise) {
            cats = await categoriesPromise;
          } else {
            categoriesPromise = (async () => {
              try {
                const catQ = query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc'));
                const catSnap = await getDocs(catQ);
                const res = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                cachedCategories = res;
                return res;
              } catch (e) {
                const fallbackCatQ = query(collection(db, 'categories'));
                const fallbackSnap = await getDocs(fallbackCatQ);
                const res = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.active !== false).sort((a,b) => (a.order || 99) - (b.order || 99));
                cachedCategories = res;
                return res;
              } finally {
                categoriesPromise = null;
              }
            })();
            cats = await categoriesPromise;
          }
        }

        if (!isMounted) return;

        // Only include categories that are explicitly set to show on home (or fallback to 'zigzag' if undefined)
        let targetCats = (cats || []).filter(c => c.homeLayout !== 'none');
        if (startIndex !== undefined || endIndex !== undefined) {
          targetCats = targetCats.slice(startIndex || 0, endIndex);
        }
        
        // Fetch articles for each category (cached globally by category name)
        const catsWithArticles = await Promise.all(targetCats.map(async (cat) => {
           let articles = [];
           try {
             if (categoryArticlesCache.has(cat.name)) {
               articles = categoryArticlesCache.get(cat.name);
             } else {
               const artQ = query(
                 collection(db, 'articles'), 
                 where('category', '==', cat.name),
                 limit(8)
               );
               const artSnap = await getDocs(artQ);
               const now = new Date();
               const published = artSnap.docs.map(d => ({id: d.id, ...d.data()}))
               .filter(a => { 
                 if (a.status === 'draft') return false;
                 if (a.status === 'scheduled') {
                   const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : (a.publishedAt ? new Date(a.publishedAt) : null);
                   if (p) return p <= now;
                   const s = a.scheduledAt ? new Date(a.scheduledAt) : null;
                   if (s) return s <= now;
                   return false;
                 }
                 const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : (a.publishedAt ? new Date(a.publishedAt) : new Date());
                 return p <= now;
               });
             published.sort((a,b) => {
               const tA = a.publishedAt?.toMillis ? a.publishedAt.toMillis() : (a.publishedAt?.seconds * 1000 || 0);
               const tB = b.publishedAt?.toMillis ? b.publishedAt.toMillis() : (b.publishedAt?.seconds * 1000 || 0);
               return tB - tA;
             });
             
             articles = published.slice(0, 5).map(data => ({
                 id: data.id,
                 title: data.title,
                 slug: data.slug,
                 img: getArticleCardImage(data),
                 videoUrl: data.videoUrl || data.youtubeUrl || data.video || null,
                 content: data.content || '',
                 publishedAt: data.publishedAt || data.createdAt
             }));
             categoryArticlesCache.set(cat.name, articles);
           }
         } catch (err) {
           console.error("Error fetching articles for category", cat.name, err);
         }
         
         return {
           ...cat,
           articles
         };
      }));
      
      if (!isMounted) return;
      // Filter out categories with 0 articles
      setCategories(catsWithArticles.filter(c => c.articles.length > 0));
    } catch (err) {
      console.error("Error fetching category blocks:", err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };
  
  fetchCategoriesAndArticles();
  return () => {
    isMounted = false;
  };
}, [startIndex, endIndex]);

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const getCategoryQuery = (name) => {
    return name;
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return 'Baru saja';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    if (isNaN(date.getTime())) return 'Baru saja';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bln lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mnt lalu";
    return Math.floor(seconds) + " dtk lalu";
  };

  if (loading) {
    return (
      <div className="category-sections" style={{ padding: '20px 0', opacity: 0.7 }}>
         <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '12px', marginBottom: '30px' }}></div>
         <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '12px' }}></div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null; // Don't render empty sections
  }

  return (
    <div className="category-sections">
      {categories.map(category => {
        const featureArticle = category.articles[0];
        const secondaryArticles = category.articles.slice(1);
        
        if (!featureArticle) return null;
        
        return (
          <section key={category.id || category.name} id={`kategori-${category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="category-block">
            <div className="category-header">
              <h2 className="category-title" style={{ color: category.color || 'inherit' }}>{category.name}</h2>
              <Link href={`/cari?q=${encodeURIComponent(getCategoryQuery(category.name))}`} className="category-link">
                Lihat Semua &rarr;
              </Link>
            </div>
            
            {category.homeLayout === 'mixed-top-3' ? (
              <div className="category-mixed-top desktop-only-category" style={{ marginTop: 'var(--spacing-md)' }}>
                {/* Top 3 Small Cards */}
                <div className="more-news-grid category-grid-3" style={{ borderTop: 'none', paddingTop: 0, paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
                  {category.articles.slice(0, 3).map((article) => (
                    <Link key={article.id} href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <article className="more-news-card">
                        <div className="more-news-img" style={{ aspectRatio: '16/10', position: 'relative' }}>
                          <LazyImage src={article.img} alt={article.title} />
                          <VideoBadge article={article} />
                        </div>
                        <div className="more-news-content">
                          <span className="more-news-category" style={{ color: category.color || 'var(--color-accent)' }}>{category.name}</span>
                          <h3 className="more-news-title" style={{ fontSize: '1.05rem', lineHeight: 1.4 }}>
                            {article.title}
                          </h3>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
                {/* Bottom 1 Large Horizontal Card */}
                {category.articles[3] && (
                  <div style={{ paddingTop: '24px' }}>
                    <Link href={`/article/${getSlug(category.articles[3])}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <article style={{ display: 'flex', gap: '24px', alignItems: 'center' }} className="mixed-bottom-horizontal">
                        <div className="img-wrapper" style={{ flex: '0 0 45%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
                          <LazyImage src={category.articles[3].img} alt={category.articles[3].title} />
                          <VideoBadge article={category.articles[3]} />
                        </div>
                        <div style={{ flex: '1' }}>
                          <span className="more-news-category" style={{ color: category.color || 'var(--color-accent)', marginBottom: '8px', display: 'block' }}>{category.name}</span>
                          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px', lineHeight: 1.3, color: 'var(--color-text)' }} className="hover-text-accent">
                            {category.articles[3].title}
                          </h3>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{timeAgo(category.articles[3].publishedAt)}</span>
                        </div>
                      </article>
                    </Link>
                  </div>
                )}
              </div>
            ) : category.homeLayout === 'grid' ? (
              <>
                {/* Desktop View: Grid Layout */}
                <div className={`more-news-grid category-grid-4 desktop-only-category ${(category.name.toLowerCase().includes('ai & tech') || category.name.toLowerCase().includes('bisnis')) ? 'grid-2-mobile' : ''}`} style={{ marginTop: 'var(--spacing-md)', borderTop: 'none', paddingTop: 0 }}>
                  {category.articles.map((article) => (
                    <Link key={article.id} href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <article className="more-news-card">
                        <div className="more-news-img" style={{ position: 'relative' }}>
                          <LazyImage src={article.img} alt={article.title} />
                          <VideoBadge article={article} />
                        </div>
                        <div className="more-news-content">
                          <span className="more-news-category" style={{ color: category.color || 'var(--color-accent)' }}>{category.name}</span>
                          <h3 className="more-news-title">
                            {article.title}
                          </h3>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>

                {/* Mobile View: Detik-style list */}
                <div className="category-detik-list mobile-only-category">
                  {/* Top Featured Box */}
                  {featureArticle && (
                    <Link href={`/article/${getSlug(featureArticle)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <article className="detik-feature-card">
                        <div className="detik-feature-content">
                          <h3 className="detik-feature-title">{featureArticle.title}</h3>
                          <span className="detik-meta">{timeAgo(featureArticle.publishedAt)}</span>
                        </div>
                        <div className="detik-feature-img" style={{ position: 'relative' }}>
                          <LazyImage src={featureArticle.img} alt={featureArticle.title} />
                          <VideoBadge article={featureArticle} />
                        </div>
                      </article>
                    </Link>
                  )}
                  {/* Secondary List */}
                  <div className="detik-secondary-list">
                    {secondaryArticles.map((article) => (
                      <Link key={article.id} href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <article className="detik-list-item">
                          <div className="detik-list-img" style={{ position: 'relative' }}>
                            <LazyImage src={article.img} alt={article.title} />
                            <VideoBadge article={article} />
                          </div>
                          <div className="detik-list-content">
                            <h4 className="detik-list-title">{article.title}</h4>
                            <span className="detik-meta">{timeAgo(article.publishedAt)}</span>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              </>

            ) : (
              <>
                {/* Desktop View: Classic Zigzag Layout */}
                <div className="category-zigzag desktop-only-category">
                  {/* Feature Article (Large Right Image) */}
                  <Link href={`/article/${getSlug(featureArticle)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <article className="zigzag-feature">
                      <div className="zigzag-content">
                        <h3 className="zigzag-title">{featureArticle.title}</h3>
                        <span className="zigzag-meta">{timeAgo(featureArticle.publishedAt)}</span>
                      </div>
                      <div className="img-wrapper zigzag-img-large" style={{ position: 'relative' }}>
                        <LazyImage src={featureArticle.img} alt={featureArticle.title} />
                        <VideoBadge article={featureArticle} />
                      </div>
                    </article>
                  </Link>
                  
                  {/* Secondary Articles List (Small Left Image) */}
                  <div className="zigzag-secondary">
                    {secondaryArticles.map((article, idx) => (
                      <Link key={article.id} href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <article className="zigzag-item">
                          <div className="img-wrapper zigzag-img-small" style={{ position: 'relative' }}>
                            <LazyImage src={article.img} alt={article.title} />
                            <VideoBadge article={article} />
                            {idx === 0 && (category.name.toLowerCase().includes('tekno') || category.name.toLowerCase().includes('video')) && !article.videoUrl && (
                              <div className="video-badge">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span>00:50</span>
                              </div>
                            )}
                          </div>
                          <div className="zigzag-content-small">
                            <h4>{article.title}</h4>
                            <span className="zigzag-meta text-secondary">{timeAgo(article.publishedAt)}</span>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Mobile View: Gambar 2 Detik Style List */}
                <div className="category-detik-list mobile-only-category">
                  {/* Top Featured Box (Gambar 2 Style) */}
                  <Link href={`/article/${getSlug(featureArticle)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <article className="detik-feature-card">
                      <div className="detik-feature-content">
                        <h3 className="detik-feature-title">{featureArticle.title}</h3>
                        <span className="detik-meta">{timeAgo(featureArticle.publishedAt)}</span>
                      </div>
                      <div className="detik-feature-img" style={{ position: 'relative' }}>
                        <LazyImage src={featureArticle.img} alt={featureArticle.title} />
                        <VideoBadge article={featureArticle} />
                      </div>
                    </article>
                  </Link>
                  
                  {/* Secondary Horizontal Articles List (Gambar 2 Style) */}
                  <div className="detik-secondary-list">
                    {secondaryArticles.map((article, idx) => (
                      <Link key={article.id} href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <article className="detik-list-item">
                          <div className="detik-list-img" style={{ position: 'relative' }}>
                            <LazyImage src={article.img} alt={article.title} />
                            <VideoBadge article={article} />
                            {idx === 0 && (category.name.toLowerCase().includes('tekno') || category.name.toLowerCase().includes('video')) && !article.videoUrl && (
                              <div className="detik-video-badge">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span>01:12</span>
                              </div>
                            )}
                          </div>
                          <div className="detik-list-content">
                            <h4 className="detik-list-title">{article.title}</h4>
                            <span className="detik-meta">{timeAgo(article.publishedAt)}</span>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default CategorySections;

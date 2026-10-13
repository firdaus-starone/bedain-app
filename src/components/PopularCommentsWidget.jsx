"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageSquare } from 'lucide-react';

const POPULAR_COMMENTS_CACHE_TTL = 15 * 60 * 1000;
const readPopularCommentsCache = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('bedain_popular_comments_cache');
    const ts = Number(sessionStorage.getItem('bedain_popular_comments_ts') || 0);
    if (raw && Date.now() - ts < POPULAR_COMMENTS_CACHE_TTL) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
};
const writePopularCommentsCache = (data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    sessionStorage.setItem('bedain_popular_comments_cache', JSON.stringify(data));
    sessionStorage.setItem('bedain_popular_comments_ts', String(Date.now()));
  } catch (e) {}
};

const PopularCommentsWidget = () => {
  const [popularArticles, setPopularArticles] = useState(() => {
    return readPopularCommentsCache() || [];
  });
  const [loading, setLoading] = useState(() => {
    return !readPopularCommentsCache();
  });

  useEffect(() => {
    let isMounted = true;
    const cached = readPopularCommentsCache();
    if (cached) {
      setPopularArticles(cached);
      setLoading(false);
      return;
    }

    const fetchPopularComments = async () => {
      try {
        // Mode hemat kuota: Pangkas dari limit 100 ke limit 20
        const q = query(
          collection(db, 'comments'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const comments = snap.docs.map(doc => doc.data());

        // Group by articleSlug
        const counts = {};
        const titles = {};
        comments.forEach(c => {
          if (c.articleSlug && c.articleTitle) {
            counts[c.articleSlug] = (counts[c.articleSlug] || 0) + 1;
            titles[c.articleSlug] = c.articleTitle;
          }
        });

        // Convert to array and sort
        const sorted = Object.keys(counts).map(slug => ({
          slug,
          title: titles[slug],
          count: counts[slug]
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        if (isMounted) {
          setPopularArticles(sorted);
          writePopularCommentsCache(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching popular comments:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchPopularComments();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return null; // Don't render if loading to avoid flashing
  if (popularArticles.length === 0) return null; // Don't render if no comments yet

  return (
    <div className="sidebar-widget popular-comments-widget" style={{ marginBottom: '24px' }}>
      <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={18} color="var(--color-accent)" />
        Banyak Dikomentari
      </h3>
      <div className="trending-list">
        {popularArticles.map((item, index) => (
          <Link key={item.slug} href={`/article/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="trending-item" style={{ cursor: 'pointer', padding: '12px 0', borderBottom: index < popularArticles.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div className="trending-content" style={{ width: '100%', paddingLeft: 0 }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', lineHeight: '1.4' }}>{item.title}</h4>
                <span className="trending-views" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <MessageSquare size={12} />
                  <span>{item.count} Komentar Diskusi</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PopularCommentsWidget;

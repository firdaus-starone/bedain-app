"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageCircle } from 'lucide-react';

const RecentCommentsWidget = () => {
  const [recentComments, setRecentComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRecentComments = async () => {
      try {
        const q = query(
          collection(db, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);

        // Filter out non-approved comments in memory to avoid missing Firestore index errors
        const allComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const comments = allComments.filter(c => c.status === 'approved');

        const uniqueArticles = [];
        const seenSlugs = new Set();

        for (const comment of comments) {
          if (!seenSlugs.has(comment.articleSlug)) {
            seenSlugs.add(comment.articleSlug);
            uniqueArticles.push({
              articleSlug: comment.articleSlug,
              articleTitle: comment.articleTitle || 'Artikel Tanpa Judul',
              latestComment: comment
            });
            if (uniqueArticles.length === 2) break;
          }
        }

        if (isMounted) {
          setRecentComments(uniqueArticles);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching recent comments:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchRecentComments();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="sidebar-widget recent-comments-widget" style={{ marginBottom: '24px' }}>
        <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={18} color="var(--color-accent)" />
          Komentar Terbaru
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Memuat komentar...</p>
      </div>
    );
  }

  return (
    <div className="sidebar-widget recent-comments-widget" style={{ marginBottom: '24px' }}>
      <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageCircle size={18} color="var(--color-accent)" />
        Komentar Terbaru
      </h3>
      <div className="trending-list">
        {recentComments.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', padding: '10px 0', fontStyle: 'italic' }}>
            Belum ada diskusi terbaru.
          </p>
        ) : (
          <>
            {recentComments.map((article, index) => (
              <Link key={article.articleSlug} href={`/article/${article.articleSlug}#comments`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="trending-item" style={{ cursor: 'pointer', padding: '12px 0', borderBottom: index < recentComments.length - 1 ? '1px solid var(--color-border)' : 'none', flexDirection: 'column', alignItems: 'flex-start' }}>

                  <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article.articleTitle}
                  </h4>

                  <div style={{ background: 'var(--color-bg-secondary)', padding: '10px 12px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        {(article.latestComment.authorName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{article.latestComment.authorName || 'Anonim'}</span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                      "{article.latestComment.content}"
                    </p>
                  </div>
                </div>
              </Link>
            ))}

            <Link
              href="/"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                marginTop: '10px',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--color-accent)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.border = '1px solid var(--color-accent)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-secondary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.border = '1px solid var(--color-border)';
              }}
            >
              Lihat Topik Lainnya
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default RecentCommentsWidget;

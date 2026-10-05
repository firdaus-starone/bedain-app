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
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const comments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (isMounted) {
          setRecentComments(comments);
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

  if (loading) return null;
  if (recentComments.length === 0) return null;

  return (
    <div className="sidebar-widget recent-comments-widget" style={{ marginBottom: '24px' }}>
      <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageCircle size={18} color="var(--color-accent)" />
        Komentar Terbaru
      </h3>
      <div className="trending-list">
        {recentComments.map((comment, index) => (
          <Link key={comment.id} href={`/article/${comment.articleSlug}#comments`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="trending-item" style={{ cursor: 'pointer', padding: '12px 0', borderBottom: index < recentComments.length - 1 ? '1px solid var(--color-border)' : 'none', flexDirection: 'column', alignItems: 'flex-start' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                  {(comment.authorName || 'A').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{comment.authorName || 'Anonim'}</span>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                "{comment.content}"
              </p>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>di</span> 
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{comment.articleTitle}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentCommentsWidget;

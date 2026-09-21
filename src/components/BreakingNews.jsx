"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Clock, TrendingUp } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const FbIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const TwIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const IgIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YtIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

// Global memory cache across mounts for BreakingNews
let cachedTopicsMemory = null;
let fetchTopicsPromise = null;

const BreakingNews = () => {
  const { settings } = useSiteSettings();
  const alertColor = 'var(--color-accent)';
  
  const [topics, setTopics] = useState(() => cachedTopicsMemory || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState('fade-in');

  useEffect(() => {
    let isMounted = true;
    if (cachedTopicsMemory) {
      setTopics(cachedTopicsMemory);
      return;
    }

    if (fetchTopicsPromise) {
      fetchTopicsPromise.then((res) => {
        if (isMounted && res) setTopics(res);
      });
      return;
    }

    const promise = (async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(12) // Ambil 12 artikel terakhir untuk dianalisa
        );
        const snap = await getDocs(q);
        const now = new Date();
        const latestArticles = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.status === 'published' && (!a.publishedAt || (a.publishedAt.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now())) <= now));
          
        const topicCounts = {};
        const tagDisplays = {};
        
        latestArticles.forEach(article => {
           const rawTags = article.tags || [];
           const tags = typeof rawTags === 'string' ? rawTags.split(',') : rawTags;
           if (Array.isArray(tags)) {
             tags.forEach(tag => {
               if (typeof tag !== 'string') return;
               const cleanTag = tag.trim();
               if (cleanTag && cleanTag.length > 2) {
                 const key = cleanTag.toLowerCase();
                 topicCounts[key] = (topicCounts[key] || 0) + 1;
                 if (!tagDisplays[key] || cleanTag === cleanTag.toUpperCase()) {
                   tagDisplays[key] = cleanTag;
                 }
               }
             });
           }
        });

        const sortedTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(entry => ({ type: 'topic', text: tagDisplays[entry[0]], count: entry[1] }));

        cachedTopicsMemory = sortedTopics;
        return sortedTopics;
      } catch (error) {
        console.error('Error fetching trending topics:', error);
        return null;
      }
    })();

    fetchTopicsPromise = promise;
    promise.then((res) => {
      if (isMounted && res) setTopics(res);
      fetchTopicsPromise = null;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const customTickerItems = settings?.tickerText 
    ? settings.tickerText.split('|').map(t => t.trim()).filter(Boolean).map(text => ({ type: 'custom', text }))
    : [];

  const allTickerItems = [...customTickerItems, ...topics];

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (settings?.tickerEnabled === false) {
    return null;
  }

  return (
    <div className="breaking-news">
      <div className="container breaking-content">
        <div className="breaking-left">
          <div className="breaking-time">
            <Clock size={14} className="time-icon" />
            <span>Today | {todayFormatted}</span>
          </div>
          <div className="breaking-ticker" style={{ display: 'flex', alignItems: 'center', gap: '16px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <span className="breaking-label" style={{ backgroundColor: alertColor, position: 'sticky', left: 0, zIndex: 2 }}>TOPIK HANGAT</span>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {allTickerItems.length > 0 ? allTickerItems.map((item, index) => (
                <span key={index} className="breaking-text">
                  {item.type === 'topic' ? (
                    <Link href={`/cari?q=${encodeURIComponent(item.text)}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      <TrendingUp size={16} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px', color: alertColor }} />
                      #{item.text.replace(/\s+/g, '')}
                    </Link>
                  ) : item.type === 'custom' ? (
                    <span>{item.text}</span>
                  ) : null}
                </span>
              )) : (
                <span className="breaking-text">Memuat topik hangat...</span>
              )}
            </div>
          </div>
        </div>

        <div className="breaking-socials">
          {settings?.facebookUrl && (
            <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FbIcon /></a>
          )}
          {settings?.twitterUrl && (
            <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter"><TwIcon /></a>
          )}
          {settings?.instagramUrl && (
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IgIcon /></a>
          )}
          {settings?.youtubeUrl && (
            <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YtIcon /></a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakingNews;


"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, getDocs, limit, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useArticles = (options = {}) => {
  const cacheKey = `bedain_articles_cache_${options.limit || 'all'}_${options.category || 'all'}_${options.isHeadline ?? 'all'}`;

  const [articles, setArticles] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      if (localStorage.getItem(cacheKey)) return false;
    } catch(e) {}
    return true;
  });
  
  const [error, setError] = useState(null);
  
  // Real-time toast banner state
  const [newArticles, setNewArticles] = useState([]);
  const displayedArticleIdsRef = useRef(new Set());
  const initialLoadTimeRef = useRef(Date.now());

  const getSortTimestamp = (item) => {
    const ts = item.publishedAt || item.createdAt || item.updatedAt;
    if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts && ts.seconds) return ts.seconds * 1000;
    if (item.date) {
      const parsed = Date.parse(item.date);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const filterPublished = (article) => {
    const now = new Date();
    if (article.status === 'draft') return false;
    if (article.status === 'scheduled') {
      const p = article.publishedAt?.toDate ? article.publishedAt.toDate() : (article.publishedAt ? new Date(article.publishedAt) : null);
      if (p) return p <= now;
      const s = article.scheduledAt ? new Date(article.scheduledAt) : null;
      if (s) return s <= now;
      return false;
    }
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribeSnapshot = null;

    const fetchArticles = async () => {
      try {
        if (articles.length === 0) setLoading(true);
        const articlesRef = collection(db, 'articles');
        
        let q = query(articlesRef, orderBy('publishedAt', 'desc'));
        
        if (options.limit) {
          q = query(q, limit(options.limit));
        }
        
        if (options.category) {
          q = query(q, where('category', '==', options.category));
        }
        
        if (options.isHeadline !== undefined) {
          q = query(q, where('isHeadline', '==', options.isHeadline));
        }

        const querySnapshot = await getDocs(q);
        const articlesData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(filterPublished);

        articlesData.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
        
        if (isMounted) {
          setArticles(articlesData);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(articlesData));
          } catch(e) {}
          
          displayedArticleIdsRef.current = new Set(articlesData.map(a => a.id));
          initialLoadTimeRef.current = Date.now();
          
          // Setup real-time listener for newly added or published articles (top 5)
          let liveQuery = query(articlesRef, orderBy('publishedAt', 'desc'), limit(5));
          if (options.category) {
            liveQuery = query(liveQuery, where('category', '==', options.category));
          }
          if (options.isHeadline !== undefined) {
            liveQuery = query(liveQuery, where('isHeadline', '==', options.isHeadline));
          }

          unsubscribeSnapshot = onSnapshot(liveQuery, (snap) => {
            if (!isMounted) return;
            const liveDocs = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(filterPublished);

            const freshDocs = liveDocs.filter(doc => {
              if (displayedArticleIdsRef.current.has(doc.id)) return false;
              const docTs = getSortTimestamp(doc);
              return docTs >= initialLoadTimeRef.current - 60000;
            });

            if (freshDocs.length > 0) {
              setNewArticles(prev => {
                const combined = [...prev];
                freshDocs.forEach(d => {
                  if (!combined.some(c => c.id === d.id)) combined.push(d);
                });
                return combined;
              });
            }
          }, (err) => {
            console.warn("Live articles snapshot warning:", err);
          });
        }
      } catch (err) {
        console.error("Error fetching articles:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArticles();

    return () => {
      isMounted = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [options.limit, options.category, options.isHeadline]);

  const refreshArticles = useCallback(() => {
    if (newArticles.length === 0) return;
    setArticles(prev => {
      const merged = [...newArticles, ...prev];
      const unique = Array.from(new Map(merged.map(a => [a.id, a])).values());
      unique.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
      displayedArticleIdsRef.current = new Set(unique.map(a => a.id));
      return options.limit ? unique.slice(0, options.limit) : unique;
    });
    setNewArticles([]);
  }, [newArticles, options.limit]);

  return { 
    articles, 
    loading, 
    error, 
    newArticlesCount: newArticles.length, 
    newArticles, 
    refreshArticles 
  };
};

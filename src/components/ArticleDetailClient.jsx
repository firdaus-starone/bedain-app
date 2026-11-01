"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, getDocs, limit, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import LazyImage from './LazyImage';
import { getYouTubeId, getArticleCardImage, getArticleVideoData } from '../lib/videoHelpers';
import Script from 'next/script';
import VideoBadge from './VideoBadge';
import AdUnit from './AdUnit';
import AdBanner from './AdBanner';
import DonationBox from './DonationBox';
import ArticleKeyPoints from './ArticleKeyPoints';
import ArticlePoll from './ArticlePoll';

import Navbar from './Navbar';
import BreakingNews from './BreakingNews';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { ArrowLeft, ArrowRight, Share2, Printer, Eye, Calendar, User, Tag, Check, Type, Heart, ThumbsUp, Flame, MessageSquare, Bookmark, Link2, Sparkles, Clock, Headphones, Play, Pause, Square, Volume2, ChevronRight, Home, Globe } from 'lucide-react';
import CommentSection from './CommentSection';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Capacitor } from '@capacitor/core';
// TextToSpeech di-load secara dinamis untuk menghindari SSR error
import { useI18n } from '../hooks/useI18n';
import { useTranslation, getCachedArticleTranslation } from '../hooks/useTranslation';
import { useAutoTranslate } from '../hooks/useAutoTranslate';
import { useAuth } from '../hooks/useAuth';
import { getPublicArticleUrl, isMobileDevice, shareArticleWithImage } from '../lib/shareHelper';

const ArticleDetail = ({ initialArticle = null }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { lang, t, changeLanguage } = useI18n();
  const { slug } = useParams();
  const router = useRouter();
  const isInitialDraftOrSched = initialArticle?.status === 'draft' || initialArticle?.status === 'scheduled';
  const [article, setArticle] = useState(isInitialDraftOrSched ? null : initialArticle);
  const [loading, setLoading] = useState(isInitialDraftOrSched ? true : !initialArticle);
  const [error, setError] = useState(null);
  const [scheduledNotice, setScheduledNotice] = useState(null);
  const [isEditorialPreview, setIsEditorialPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // 'normal', 'large', 'xlarge'
  const [reaction, setReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState(() => ({
    like: 0,
    insightful: 0,
    fire: 0,
    love: 0,
    ...(initialArticle?.reactions || {})
  }));
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [realCommentCount, setRealCommentCount] = useState(() => initialArticle?.commentCount || 0);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVoiceIndex, setTtsVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const { settings } = useSiteSettings();

  const { 
    translating, 
    translatedArticle, 
    detectedLang, 
    currentTargetLang,
    showBanner, 
    setShowBanner, 
    LANG_NAMES, 
    triggerTranslation,
    resetTranslation
  } = useTranslation(article, lang);
  const { translateArticleTitle } = useAutoTranslate();
  
  const displayArticle = React.useMemo(() => {
    if (!article) return null;
    
    // Choose title and content based on language or AI translation
    const cached = getCachedArticleTranslation(article.id, currentTargetLang || lang);
    const activeTrans = (translatedArticle && translatedArticle.title) ? translatedArticle : cached;

    let title = article.title;
    let content = article.content;
    let excerpt = article.excerpt || article.seoDescription || '';
    let seoDescription = article.seoDescription || article.excerpt || '';
    let keyPoints = article.keyPoints || [];
    
    if (activeTrans && activeTrans.title && (currentTargetLang !== 'id' || lang !== 'id')) {
      title = activeTrans.title || title;
      content = activeTrans.content || content;
      excerpt = activeTrans.excerpt || activeTrans.seoDescription || excerpt;
      seoDescription = activeTrans.seoDescription || activeTrans.excerpt || seoDescription;
      if (activeTrans.keyPoints && activeTrans.keyPoints.length > 0) {
        keyPoints = activeTrans.keyPoints;
      }
    } else if (lang === 'en') {
      if (article.title_en) title = article.title_en;
      if (article.content_en) content = article.content_en;
      if (article.excerpt_en || article.seoDescription_en) {
        excerpt = article.excerpt_en || article.seoDescription_en;
        seoDescription = article.seoDescription_en || article.excerpt_en;
      }
    } else if (lang === 'zh') {
      if (article.title_zh) title = article.title_zh;
      if (article.content_zh) content = article.content_zh;
      if (article.excerpt_zh || article.seoDescription_zh) {
        excerpt = article.excerpt_zh || article.seoDescription_zh;
        seoDescription = article.seoDescription_zh || article.excerpt_zh;
      }
    }

    return {
      ...article,
      title,
      content,
      excerpt,
      seoDescription,
      keyPoints
    };
  }, [article, lang, currentTargetLang, translatedArticle]);

  // Otomatis translate jika bahasa aktif aplikasi berubah (misal dari Navbar atau PWA switcher)
  useEffect(() => {
    if (article?.id && article?.content && lang && lang !== 'id') {
      const hasStatic = lang === 'en' ? (article.title_en && article.content_en) : (article.title_zh && article.content_zh);
      if (!hasStatic) {
        triggerTranslation(lang);
      }
    } else if (lang === 'id' && currentTargetLang !== 'id') {
      resetTranslation();
    }
  }, [lang, article?.id, article?.content, currentTargetLang, triggerTranslation, resetTranslation]);

  useEffect(() => {
    setIsClient(true);
    window.scrollTo(0, 0);
    try {
      const saved = localStorage.getItem('bedain_font_size');
      if (saved && ['normal', 'large', 'xlarge'].includes(saved)) {
        setFontSize(saved);
      }
    } catch (e) {}

    const now = new Date();
    const isSched = initialArticle?.status === 'scheduled';
    let scheduledDate = null;
    if (initialArticle?.publishedAt?.toDate) {
      scheduledDate = initialArticle.publishedAt.toDate();
    } else if (initialArticle?.publishedAt) {
      scheduledDate = new Date(initialArticle.publishedAt);
    } else if (initialArticle?.scheduledAt) {
      let s = String(initialArticle.scheduledAt).trim();
      if (!s.includes('Z') && !s.includes('+') && !s.includes('-', 10)) {
        s += '+07:00';
      }
      scheduledDate = new Date(s);
    }
    const isNotYetPublished = isSched && scheduledDate && scheduledDate > now;
    const isDraft = initialArticle?.status === 'draft';

    // Mode hemat kuota: Hanya gunakan initialArticle jika sudah tayang publik dan memiliki ID dokumen
    if (!isDraft && !isNotYetPublished && initialArticle && initialArticle.id && (initialArticle.slug === slug || !slug)) {
      setArticle(initialArticle);
      setLoading(false);
      return;
    }

    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'articles'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docData = snap.docs[0];
          const foundArticle = { id: docData.id, ...docData.data() };

          // Verifikasi status tayang & jam jadwal
          const now = new Date();
          const isSched = foundArticle.status === 'scheduled';
          let scheduledDate = null;
          if (foundArticle.publishedAt?.toDate) {
            scheduledDate = foundArticle.publishedAt.toDate();
          } else if (foundArticle.publishedAt) {
            scheduledDate = new Date(foundArticle.publishedAt);
          } else if (foundArticle.scheduledAt) {
            let s = String(foundArticle.scheduledAt).trim();
            if (!s.includes('Z') && !s.includes('+') && !s.includes('-', 10)) {
              s += '+07:00';
            }
            scheduledDate = new Date(s);
          }

          const isNotYetPublished = isSched && scheduledDate && scheduledDate > now;
          const isDraft = foundArticle.status === 'draft';
          const activeUser = currentUser || auth?.currentUser;

          // Jika pengunjung umum dan berita belum waktunya tayang / masih draf:
          if ((isNotYetPublished || isDraft) && !activeUser) {
            if (authLoading) {
              return; // Tunggu proses verifikasi login selesai
            }
            if (isNotYetPublished) {
              const timeFormatted = scheduledDate.toLocaleString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              });
              setScheduledNotice({
                title: foundArticle.title,
                timeStr: timeFormatted
              });
            } else {
              setError('Berita ini masih berupa draf dan belum diterbitkan oleh redaksi.');
            }
            setLoading(false);
            return;
          }

          if (isNotYetPublished || isDraft) {
            setIsEditorialPreview(true);
          }

          setArticle(foundArticle);

          try {
            const viewedKey = `viewed_${docData.id}`;
            if (!sessionStorage.getItem(viewedKey)) {
              sessionStorage.setItem(viewedKey, '1');
              let city = 'Lainnya';
              try {
                const geoRes = await fetch('https://ipapi.co/json/');
                if (geoRes.ok) {
                  const geoData = await geoRes.json();
                  if (geoData && geoData.city) {
                    city = geoData.city;
                  }
                }
              } catch (geoErr) { /* fallback to Lainnya */ }

              await updateDoc(doc(db, 'articles', docData.id), { 
                views: increment(1),
                [`cities.${city}`]: increment(1)
              });
            }
          } catch (e) { /* ignore */ }
        } else {
          try {
            const docRef = doc(db, 'articles', slug);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const now = new Date();
              const isSched = data.status === 'scheduled';
              let scheduledDate = null;
              if (data.publishedAt?.toDate) {
                scheduledDate = data.publishedAt.toDate();
              } else if (data.publishedAt) {
                scheduledDate = new Date(data.publishedAt);
              } else if (data.scheduledAt) {
                let s = String(data.scheduledAt).trim();
                if (!s.includes('Z') && !s.includes('+') && !s.includes('-', 10)) {
                  s += '+07:00';
                }
                scheduledDate = new Date(s);
              }
              const isNotYetPublished = isSched && scheduledDate && scheduledDate > now;
              const isDraft = data.status === 'draft';
              const activeUser = currentUser || auth?.currentUser;

              if ((isNotYetPublished || isDraft) && !activeUser) {
                if (authLoading) {
                  return;
                }
                if (isNotYetPublished) {
                  const timeFormatted = scheduledDate.toLocaleString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  });
                  setScheduledNotice({
                    title: data.title,
                    timeStr: timeFormatted
                  });
                } else {
                  setError('Artikel ini masih berupa draf dan belum diterbitkan.');
                }
                setLoading(false);
                return;
              }

              if (isNotYetPublished || isDraft) {
                setIsEditorialPreview(true);
              }

              setArticle({ id: docSnap.id, ...data });
              setLoading(false);
              return;
            }
          } catch (e) { /* ignore */ }
          setError('Berita tidak ditemukan atau telah dihapus oleh redaksi.');
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError('Terjadi kesalahan saat memuat berita.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      setDismissNextArticle(false);
      fetchArticle();
    }
  }, [slug, currentUser, authLoading]);

  const [dismissNextArticle, setDismissNextArticle] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!article) return;
    try {
      const stored = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
      const exists = stored.some(item => item.id === article.id || item.slug === article.slug);
      setIsBookmarked(exists);

      if (article.reactions) {
        setReactionCounts(prev => ({ ...prev, ...article.reactions }));
      }
      const userReact = localStorage.getItem(`reaction_${article.id}`);
      if (userReact) {
        setReaction(userReact);
      }
    } catch (e) { /* ignore */ }
  }, [article]);

  // Real-time Dynamic Client-Side Title, Canonical Link & Open Graph Meta SEO
  useEffect(() => {
    if (!displayArticle?.title) return;
    const siteName = settings?.siteName || 'Bedain News';
    document.title = `${displayArticle.title} - ${siteName}`;

    const articleUrl = `https://bedainnews.com/article/${displayArticle.slug || slug}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', articleUrl);

    const contentStr = typeof displayArticle.content === 'string' ? displayArticle.content : '';
    const excerptText = (typeof displayArticle.seoDescription === 'string' && displayArticle.seoDescription) || (typeof displayArticle.excerpt === 'string' && displayArticle.excerpt) || contentStr.replace(/<[^>]+>/g, '').slice(0, 155) || '';
    const rawCoverImg = typeof (displayArticle.coverImage || displayArticle.imageUrl) === 'string' ? (displayArticle.coverImage || displayArticle.imageUrl) : '';
    // Ensure the image URL is always absolute for OG sharing to work
    const coverImg = rawCoverImg.startsWith('http')
      ? rawCoverImg
      : rawCoverImg
        ? `https://bedainnews.com${rawCoverImg.startsWith('/') ? '' : '/'}${rawCoverImg}`
        : 'https://bedainnews.com/logo.png';

    const imageMimeType = coverImg.includes('.webp') ? 'image/webp' : coverImg.includes('.png') ? 'image/png' : 'image/jpeg';

    const updateMeta = (property, content, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let tag = document.querySelector(`meta[${attr}="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateMeta('description', excerptText, true);
    updateMeta('og:title', `${displayArticle.title} - ${siteName}`);
    updateMeta('og:description', excerptText);
    updateMeta('og:image', coverImg);
    updateMeta('og:image:secure_url', coverImg);
    updateMeta('og:image:width', '1200');
    updateMeta('og:image:height', '630');
    updateMeta('og:image:type', imageMimeType);
    updateMeta('og:url', articleUrl);
    updateMeta('twitter:card', 'summary_large_image', true);
    updateMeta('twitter:title', `${displayArticle.title} - ${siteName}`, true);
    updateMeta('twitter:description', excerptText, true);
    updateMeta('twitter:image', coverImg, true);

    // Load Google Reader Revenue Manager script dynamically AFTER the React component (and CTA div) is mounted
    if (typeof window !== 'undefined' && !document.getElementById('swg-basic-script')) {
      // First, define the initialization queue
      window.SWG_BASIC = window.SWG_BASIC || [];
      window.SWG_BASIC.push(basicSubscriptions => {
        try {
          basicSubscriptions.init({
            type: "NewsArticle",
            isPartOfType: ["Product"],
            isPartOfProductId: "CAowlP7gCw:openaccess",
            autoPromptType: "none",
            clientOptions: { theme: "light", lang: "id" },
          });
        } catch (e) {
          console.error('SWG Init error:', e);
        }
      });

      // Then inject the script
      const script = document.createElement('script');
      script.id = 'swg-basic-script';
      script.src = 'https://news.google.com/swg/js/v1/swg-basic.js';
      script.async = true;
      document.body.appendChild(script);
    } else if (typeof window !== 'undefined' && window.SWG_BASIC && typeof window.SWG_BASIC.push === 'function') {
        // If script is already loaded from a previous article visit, try pushing init again
        window.SWG_BASIC.push(basicSubscriptions => {
          try {
            basicSubscriptions.init({
              type: "NewsArticle",
              isPartOfType: ["Product"],
              isPartOfProductId: "CAowlP7gCw:openaccess",
              autoPromptType: "none",
              clientOptions: { theme: "light", lang: "id" },
            });
          } catch (e) {
            console.error('SWG Init error:', e);
          }
        });
    }

    return () => {
      document.title = siteName;
      // Note: we don't remove the script on unmount to cache it, but it handles subsequent initializations above
    };
  }, [displayArticle, settings?.siteName, slug]);

  useEffect(() => {
    if (!article?.category) return;
    const cacheKey = `bedain_related_v2_${article.category}_${article.id || ''}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 6) {
          setRelatedArticles(parsed);
          return;
        }
      }
    } catch(e) {}

    const fetchRelated = async () => {
      try {
        const q = query(collection(db, 'articles'), where('category', '==', article.category), limit(10));
        const snap = await getDocs(q);
        const now = new Date();
        let related = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.id !== article.id && a.title !== article.title)
          .filter(a => { 
            if (a.status === 'draft') return false;
            const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); 
            return p <= now; 
          });
        
        let finalRelated = related.slice(0, 6);

        // Jika artikel dalam kategori yang sama kurang dari 6, lengkapi dengan artikel terbaru agar selalu penuh 6 kartu
        if (finalRelated.length < 6) {
          try {
            const fallbackQ = query(collection(db, 'articles'), limit(10));
            const fallbackSnap = await getDocs(fallbackQ);
            const fallbackArticles = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }))
              .filter(a => a.id !== article.id && a.title !== article.title && !finalRelated.some(r => r.id === a.id))
              .filter(a => { 
                if (a.status === 'draft') return false;
                const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); 
                return p <= now; 
              });
            finalRelated = [...finalRelated, ...fallbackArticles].slice(0, 6);
          } catch(err) {}
        }

        setRelatedArticles(finalRelated);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(finalRelated)); } catch(e) {}
      } catch (e) {
        console.error("Error fetching related:", e);
        setRelatedArticles([]);
      }
    };
    fetchRelated();
  }, [article?.category, article?.id, article?.title]);

  useEffect(() => {
    if (!article?.title) return;
    const cacheKey = 'bedain_recommended_cache';
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setRecommendedArticles(JSON.parse(cached));
        return;
      }
    } catch(e) {}

    const fetchRecommended = async () => {
      try {
        const q = query(collection(db, 'articles'), limit(8));
        const snap = await getDocs(q);
        const now = new Date();
        let recs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.id !== article.id && a.title !== article.title)
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        const finalRecs = recs.slice(0, 6);
        setRecommendedArticles(finalRecs);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(finalRecs)); } catch(e) {}
      } catch (e) {
        console.error("Error fetching recommended:", e);
        setRecommendedArticles([]);
      }
    };
    fetchRecommended();
  }, [article?.id, article?.title]);

  useEffect(() => {
    if (!slug) return;
    if (typeof article?.commentCount === 'number') {
      setRealCommentCount(article.commentCount);
      return;
    }
    const fetchCommentCount = async () => {
      try {
        const q = query(
          collection(db, 'comments'),
          where('articleSlug', '==', slug),
          where('status', '==', 'approved'),
          limit(20)
        );
        const snap = await getDocs(q);
        setRealCommentCount(snap.size);
      } catch (e) {
        console.error("Error fetching comment count:", e);
      }
    };
    fetchCommentCount();
  }, [slug, article?.commentCount]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setScrollY(currentScrollY);

          const isScrolled = currentScrollY > 300;
          setScrolled(prev => prev !== isScrolled ? isScrolled : prev);
          
          const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scrolled = (winScroll / height) * 100;
          setScrollProgress(scrolled);

          // Parallax effect for the right sidebar
          const offset = currentScrollY > 100 ? Math.min((currentScrollY - 100) * 0.05, 40) : 0;
          setParallaxOffset(offset);
          
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    if (!article) return;

    // 1. Pada perangkat mobile/HP yang mendukung Web Share API, panggil native share sheet
    if (isMobileDevice() && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        setIsSharing(true);
        const publicUrl = getPublicArticleUrl(article);
        const title = displayArticle?.title || article.title || 'Bedain News';
        const text = displayArticle?.seoDescription || displayArticle?.excerpt || article.seoDescription || article.excerpt || `${title} - Bedain News`;

        await navigator.share({
          title,
          text,
          url: publicUrl
        });
        return;
      } catch (err) {
        // Abaikan jika user sengaja membatalkan sheet (AbortError)
        if (err && (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel') || err.message?.toLowerCase().includes('dismiss'))) {
          return;
        }
        console.warn('Native Web Share tidak tersedia atau dibatalkan, beralih ke modal:', err);
      } finally {
        setIsSharing(false);
      }
    }

    // 2. Pada desktop browser atau fallback jika native share gagal, langsung buka modal share interaktif
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    if (!article) return;
    const publicUrl = getPublicArticleUrl(article);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {
        prompt('Salin tautan artikel ini:', publicUrl);
      });
    } else {
      prompt('Salin tautan artikel ini:', publicUrl);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFontSize = () => {
    setFontSize(prev => {
      const next = prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal';
      try {
        localStorage.setItem('bedain_font_size', next);
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
        TextToSpeech.getSupportedLanguages().catch(e => console.log('TTS init:', e));
      });
      return () => {
        import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
          TextToSpeech.stop().catch(() => {});
        });
      };
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const idVoices = voices.filter(v => 
          v.lang.toLowerCase().includes('id') || 
          v.name.toLowerCase().includes('indonesia')
        );
        if (idVoices.length > 0) {
          setAvailableVoices(idVoices);
          const preferredIdx = idVoices.findIndex(v => v.name.toLowerCase().includes('bahasa indonesia') || v.name.toLowerCase().includes('google'));
          setTtsVoiceIndex(preferredIdx !== -1 ? preferredIdx : 0);
        } else {
          setAvailableVoices(voices);
        }
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, []);

  const handleToggleTTS = async () => {
    const cleanSpeechText = (rawHtml) => {
      if (!rawHtml) return '';
      let text = rawHtml
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, ' dan ')
        .replace(/&quot;/gi, '')
        .replace(/&#39;/gi, '')
        .replace(/&lt;/gi, '')
        .replace(/&gt;/gi, '');
      if (typeof document !== 'undefined') {
        const tmp = document.createElement('div');
        tmp.innerHTML = text;
        text = tmp.textContent || tmp.innerText || '';
      }
      return text.replace(/\s+/g, ' ').trim();
    };

    const plainTextTitle = cleanSpeechText(displayArticle?.title || '');
    const plainTextContent = cleanSpeechText(displayArticle?.content || '');
    const fullText = `${plainTextTitle}. ${plainTextContent}`;

    if (!fullText) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        if (isPlayingTTS) {
          await TextToSpeech.stop().catch(() => {});
          setIsPlayingTTS(false);
          setTtsPaused(false);
          return;
        }

        setIsPlayingTTS(true);
        setTtsPaused(false);

        await TextToSpeech.speak({
          text: fullText,
          lang: 'id-ID',
          rate: ttsRate
        });
        setIsPlayingTTS(false);
        setTtsPaused(false);
      } catch (err) {
        console.error("Native TTS Error:", err);
        setIsPlayingTTS(false);
        setTtsPaused(false);
        alert('Maaf, mesin suara Text-to-Speech (TTS) pada perangkat Android Anda belum aktif atau tidak mendukung bahasa Indonesia.');
      }
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Maaf, browser Anda tidak mendukung fitur Text-to-Speech.');
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlayingTTS) {
      if (ttsPaused) {
        synth.resume();
        setTtsPaused(false);
      } else {
        synth.pause();
        setTtsPaused(true);
      }
      return;
    }

    synth.cancel();

    // Workaround untuk bug Web Speech API di Chrome (terhenti setelah 15 detik/teks terlalu panjang)
    // 1. Pecah teks menjadi kalimat-kalimat (chunks)
    const sentences = (fullText.match(/[^.!?]+[.!?]+/g) || [fullText]).map(s => s.trim()).filter(Boolean);
    if (sentences.length === 0) return;

    window._ttsCancelled = false;
    let currentIndex = 0;

    const playNext = () => {
      if (window._ttsCancelled || currentIndex >= sentences.length) {
        setIsPlayingTTS(false);
        setTtsPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
      utterance.lang = 'id-ID';
      utterance.rate = ttsRate;
      const selectedVoice = availableVoices[ttsVoiceIndex];
      if (selectedVoice && (selectedVoice.lang.toLowerCase().includes('id') || selectedVoice.name.toLowerCase().includes('indonesia'))) {
        utterance.voice = selectedVoice;
      }

      // 2. Simpan referensi utterance di window agar tidak terkena Garbage Collection (GC)
      window._currentUtterance = utterance;

      utterance.onstart = () => {
        if (currentIndex === 0) {
          setIsPlayingTTS(true);
          setTtsPaused(false);
        }
      };

      utterance.onend = () => {
        if (window._ttsCancelled) return;
        currentIndex++;
        playNext();
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted' || window._ttsCancelled) return;
        console.error("TTS Error on chunk", currentIndex, e);
        setIsPlayingTTS(false);
        setTtsPaused(false);
      };

      synth.speak(utterance);
    };

    playNext();
  };

  const handleStopTTS = () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
        TextToSpeech.stop().catch(() => {});
      });
      setIsPlayingTTS(false);
      setTtsPaused(false);
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window._ttsCancelled = true;
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      setTtsPaused(false);
    }
  };

  const handleChangeRate = (newRate) => {
    setTtsRate(newRate);
    if (isPlayingTTS) {
      handleStopTTS();
    }
  };

  const handleReaction = async (type) => {
    let targetId = article?.id;
    if (!targetId && (article?.slug || slug)) {
      try {
        const q = query(collection(db, 'articles'), where('slug', '==', article?.slug || slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetId = snap.docs[0].id;
          setArticle(prev => (prev ? { ...prev, id: targetId } : { id: targetId }));
        }
      } catch (e) {
        console.error('Error finding article id for reaction:', e);
      }
    }
    if (!targetId) return;

    const oldReaction = reaction;
    
    if (oldReaction === type) {
      setReaction(null);
      setReactionCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 1) - 1) }));
      try {
        localStorage.removeItem(`reaction_${targetId}`);
        await updateDoc(doc(db, 'articles', targetId), {
          [`reactions.${type}`]: increment(-1)
        });
      } catch (err) {
        console.error('Error removing reaction in Firestore:', err);
      }
    } else {
      if (oldReaction) {
        setReactionCounts(prev => ({ ...prev, [oldReaction]: Math.max(0, (prev[oldReaction] || 1) - 1) }));
        try {
          await updateDoc(doc(db, 'articles', targetId), {
            [`reactions.${oldReaction}`]: increment(-1)
          });
        } catch (err) {
          console.error('Error decreasing old reaction in Firestore:', err);
        }
      }
      setReaction(type);
      setReactionCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
      try {
        localStorage.setItem(`reaction_${targetId}`, type);
        await updateDoc(doc(db, 'articles', targetId), {
          [`reactions.${type}`]: increment(1)
        });
      } catch (err) {
        console.error('Error saving reaction in Firestore:', err);
      }
    }
  };

  const toggleBookmark = () => {
    if (!article) return;
    try {
      const stored = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
      const existsIndex = stored.findIndex(item => (article.id && item.id === article.id) || (article.slug && item.slug === article.slug) || (slug && item.slug === slug));
      let updated;
      if (existsIndex >= 0) {
        updated = stored.filter((_, idx) => idx !== existsIndex);
        setIsBookmarked(false);
      } else {
        updated = [
          {
            id: article.id || article.slug || slug,
            slug: article.slug || slug,
            title: article.title,
            coverImage: article.coverImage || article.imageUrl,
            category: article.category || 'Berita',
            publishedAt: article.publishedAt?.toDate ? article.publishedAt.toDate().toISOString() : (article.publishedAt || new Date().toISOString())
          },
          ...stored
        ];
        setIsBookmarked(true);
      }
      localStorage.setItem('bedain_bookmarks', JSON.stringify(updated));
      window.dispatchEvent(new Event('bookmarksUpdated'));
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  };

  const getFontSizeValue = () => {
    if (fontSize === 'large') return '1.22rem';
    if (fontSize === 'xlarge') return '1.38rem';
    return '1.05rem';
  };

  const formatDate = (val) => {
    if (!val) return lang === 'zh' ? '今天' : lang === 'en' ? 'Today' : 'Hari ini';
    let d = null;
    if (typeof val.toDate === 'function') {
      try { d = val.toDate(); } catch (e) {}
    } else if (val && typeof val.seconds === 'number') {
      try { d = new Date(val.seconds * 1000); } catch (e) {}
    } else {
      try { d = new Date(val); } catch (e) {}
    }
    if (!d || isNaN(d.getTime())) return lang === 'zh' ? '今天' : lang === 'en' ? 'Today' : 'Hari ini';

    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'id-ID';
    try {
      const formatted = d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return lang === 'id' ? `${formatted} WIB` : formatted;
    } catch (e) {
      return lang === 'zh' ? '今天' : lang === 'en' ? 'Today' : 'Hari ini';
    }
  };

  const timeAgo = (val) => {
    if (!val) return t('time.just_now') || (lang === 'zh' ? '刚刚' : lang === 'en' ? 'Just now' : 'Baru saja');
    let date = null;
    if (typeof val.toDate === 'function') {
      try { date = val.toDate(); } catch (e) {}
    } else if (val && typeof val.seconds === 'number') {
      try { date = new Date(val.seconds * 1000); } catch (e) {}
    } else {
      try { date = new Date(val); } catch (e) {}
    }
    if (!date || isNaN(date.getTime())) return t('time.just_now') || (lang === 'zh' ? '刚刚' : lang === 'en' ? 'Just now' : 'Baru saja');

    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 0) return t('time.just_now') || (lang === 'zh' ? '刚刚' : lang === 'en' ? 'Just now' : 'Baru saja');

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} ${t('time.years_ago') || (lang === 'zh' ? '年前' : lang === 'en' ? 'years ago' : 'tahun lalu')}`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} ${t('time.months_ago') || (lang === 'zh' ? '个月前' : lang === 'en' ? 'months ago' : 'bulan lalu')}`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} ${t('time.days_ago') || (lang === 'zh' ? '天前' : lang === 'en' ? 'days ago' : 'hari lalu')}`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} ${t('time.hours_ago') || (lang === 'zh' ? '小时前' : lang === 'en' ? 'hours ago' : 'jam lalu')}`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} ${t('time.minutes_ago') || (lang === 'zh' ? '分钟前' : lang === 'en' ? 'minutes ago' : 'menit lalu')}`;
    return `${Math.floor(seconds)} ${t('time.seconds_ago') || (lang === 'zh' ? '秒前' : lang === 'en' ? 'seconds ago' : 'detik lalu')}`;
  };

  const getCategoryLabel = (cat) => {
    if (!cat) return t('categories.berita') || (lang === 'zh' ? '新闻' : lang === 'en' ? 'News' : 'Berita');
    const catSlug = String(cat).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return t(`categories.${catSlug}`) || cat;
  };

  // Moved useEffect above early returns to fix React hook order (#310/#418)
  useEffect(() => {
    if (!article) return;
    const videoData = getArticleVideoData(article);
    if (videoData) {
      if (videoData.type === 'facebook' && typeof window !== 'undefined' && window.FB) {
        window.FB.XFBML.parse();
      }
      if (videoData.type === 'tiktok' && typeof window !== 'undefined' && window.tiktokEmbed) {
        window.tiktokEmbed.render();
      }
    }
  }, [article]);

  if (loading) {
    return (
      <div className="app-container">
        <Navbar />
        <div style={{ textAlign: 'center', padding: '150px 0', minHeight: '70vh' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {lang === 'zh' ? '正在为您加载最新新闻...' : lang === 'en' ? 'Loading latest news for you...' : 'Memuat berita terkini untuk Anda...'}
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (scheduledNotice) {
    return (
      <div className="app-container" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 20px', minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '560px', width: '100%', background: 'var(--color-bg-secondary)', padding: '48px 32px', borderRadius: '24px', border: '1px solid rgba(168, 85, 247, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              <Clock size={36} />
            </div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '12px', color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              {lang === 'zh' ? '此新闻尚未发布' : lang === 'en' ? 'This News is Not Yet Published' : 'Berita Ini Belum Tayang'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', marginBottom: '20px', lineHeight: 1.6 }}>
              {lang === 'zh' ? (
                <>文章 <strong>"{scheduledNotice.title}"</strong> 已由编辑部预排，将于以下时间自动发布：</>
              ) : lang === 'en' ? (
                <>Article <strong>"{scheduledNotice.title}"</strong> is scheduled and will automatically publish at:</>
              ) : (
                <>Artikel <strong>"{scheduledNotice.title}"</strong> telah dijadwalkan oleh redaksi dan akan tayang otomatis pada:</>
              )}
            </p>
            <div style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '14px', color: '#d8b4fe', fontWeight: 700, fontSize: '15px', marginBottom: '24px' }}>
              ⏰ {scheduledNotice.timeStr}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '32px', opacity: 0.8 }}>
              {lang === 'zh' ? '请于发布时间再次访问以阅读完整报道。' : lang === 'en' ? 'Please return when published to read the full report.' : 'Silakan kunjungi kembali saat jam tayang tiba untuk membaca liputan lengkapnya.'}
            </p>
            <Link href="/" className="btn" style={{ background: 'linear-gradient(135deg, var(--color-accent), #ff5252)', color: 'var(--color-text-primary)', padding: '12px 30px', borderRadius: '30px', textDecoration: 'none', fontWeight: 600, display: 'inline-block', boxShadow: '0 8px 16px rgba(230,57,70,0.3)' }}>
              {lang === 'zh' ? '返回首页' : lang === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="app-container">
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', background: 'var(--color-bg-secondary)', padding: '40px', borderRadius: '24px', border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              {lang === 'zh' ? '未找到新闻' : lang === 'en' ? 'News Not Found' : 'Berita Tidak Ditemukan'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
              {error || (lang === 'zh' ? '抱歉，您查找的文章不存在或正在更新。' : lang === 'en' ? 'Sorry, the article you are looking for is unavailable or being updated.' : 'Maaf, artikel yang Anda cari tidak tersedia atau sedang diperbarui.')}
            </p>
            <Link href="/" className="btn" style={{ background: 'linear-gradient(135deg, var(--color-accent), #ff5252)', color: 'var(--color-text-primary)', padding: '14px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: 600, display: 'inline-block', boxShadow: '0 8px 16px rgba(230,57,70,0.3)' }}>
              {lang === 'zh' ? '返回主页' : lang === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Helper to extract YouTube ID (imported from videoHelpers)

  const videoId = getYouTubeId(article.videoUrl) || getYouTubeId(article.youtubeUrl) || getYouTubeId(article.video) || getYouTubeId(article.content);
  const videoData = getArticleVideoData(article);


  // Pisahkan konten menjadi array blok paragraf untuk menyisipkan Iklan dan Baca Juga
  const getProcessedContentBlocks = () => {
    if (!displayArticle || typeof displayArticle.content !== 'string' || !displayArticle.content) {
      return [lang === 'zh' ? '<p>正在加载新闻内容...</p>' : lang === 'en' ? '<p>Loading article content...</p>' : '<p>Konten berita sedang dimuat...</p>'];
    }

    let contentHtml = displayArticle.content.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');

    // Bersihkan warna hitam/gelap hardcoded bawaan copy-paste dari Word/web
    contentHtml = contentHtml.replace(/color:\s*(rgb\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*\)|#[0-3][0-3][0-3][0-3][0-3][0-3]|#[0-3][0-3][0-3]|black)\s*;?/gi, '');

    // Fitur Pembersih Spasi Kosong (White Space Cleaner)
    // Menghapus paragraf kosong seperti <p><br></p> atau <p> </p>
    contentHtml = contentHtml.replace(/<p>(\s|<br\s*\/?>)*<\/p>/gi, '');
    // Mencegah spasi <br> bertumpuk menjadi celah putih yang panjang
    contentHtml = contentHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');

    if (!contentHtml.includes('<p>')) {
      const parts = contentHtml.split(/\n+/).map(p => p.trim()).filter(Boolean);
      contentHtml = parts.map(p => `<p>${p}</p>`).join('');
    }

    if (displayArticle.location && typeof displayArticle.location === 'string') {
      contentHtml = contentHtml.replace(/<p[^>]*>/i, (match) => {
        return `${match}<strong>${displayArticle.location.toUpperCase()}</strong> - `;
      });
    }

    // Bersihkan duplikat iframe untuk videoId utama yang sudah tampil di Hero Section
    if (videoId) {
      const duplicateIframeRegex = new RegExp(`<iframe[^>]+src=["'][^"']*${videoId}[^"']*["'][^>]*>(?:<\\/iframe>)?`, 'gi');
      contentHtml = contentHtml.replace(duplicateIframeRegex, '');
    }

    // Otomatis ubah link YouTube mentah di dalam teks konten menjadi pemutar video responsif
    contentHtml = contentHtml.replace(/(?:<p>[^<]*?)?(?:<a[^>]*>)?(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<"']*)(?:<\/a>)?(?:<\/p>)?/gi, (match, id) => {
      if (id === videoId) return '';
      return `<div class="article-main-video-wrapper hero-media-mobile-full" style="margin: 24px 0; background: var(--color-bg-secondary); position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 12px;"></iframe></div>`;
    });

    const BREAK_TOKEN = '|||BREAK|||';
    let splitHtml = contentHtml.replace(/<\/p>/gi, `</p>${BREAK_TOKEN}`);
    
    if ((contentHtml.match(/<\/p>/gi) || []).length < 2) {
      splitHtml = splitHtml.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, `<br><br>${BREAK_TOKEN}`);
      if (!splitHtml.includes(BREAK_TOKEN)) {
        splitHtml = splitHtml.replace(/<br\s*\/?>/gi, `<br>${BREAK_TOKEN}`);
      }
    }

    return splitHtml.split(BREAK_TOKEN).filter(b => b.trim() !== '');
  };

  const contentBlocks = getProcessedContentBlocks();

  // Calculate Estimated Reading Time & Word Count
  const contentString = typeof displayArticle.content === 'string' ? displayArticle.content : "";
  const cleanText = contentString.replace(/<[^>]+>/g, '').trim();
  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Tooltips localized for share & reaction bars
  const likeTooltip = lang === 'zh' ? '赞' : lang === 'en' ? 'Like' : 'Suka';
  const commentTooltip = lang === 'zh' ? '评论' : lang === 'en' ? 'Comments' : 'Komentar';
  const bookmarkTooltip = isBookmarked
    ? (lang === 'zh' ? '取消收藏' : lang === 'en' ? 'Remove Bookmark' : 'Hapus dari Tersimpan')
    : (lang === 'zh' ? '收藏文章 / 稍后阅读' : lang === 'en' ? 'Bookmark / Read Later' : 'Simpan Artikel / Baca Nanti');
  const shareTooltip = t('article.share') || (lang === 'zh' ? '分享' : lang === 'en' ? 'Share' : 'Bagikan');
  const copyTooltip = lang === 'zh' ? '复制链接' : lang === 'en' ? 'Copy Link' : 'Salin Tautan';
  const fontSizeTooltip = lang === 'zh'
    ? `字体大小: ${fontSize === 'normal' ? '标准 (点击放大)' : fontSize === 'large' ? '大 (+)' : '特大 (++)'}`
    : lang === 'en'
    ? `Font Size: ${fontSize === 'normal' ? 'Normal (Click to enlarge)' : fontSize === 'large' ? 'Large (+)' : 'Extra Large (++)'}`
    : `Ukuran Font: ${fontSize === 'normal' ? 'Normal (Klik untuk Memperbesar)' : fontSize === 'large' ? 'Besar (+)' : 'Sangat Besar (++)'}`;

  return (
    <div className="app-container modern-article" style={{ background: 'var(--color-bg-primary)' }}>
      <BreakingNews />
      
      {/* Reading Progress Bar with Gradient & Glow */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', background: 'transparent', zIndex: 99999 }}>
        <div style={{ 
          height: '100%', 
          width: `${scrollProgress}%`, 
          background: 'linear-gradient(90deg, var(--color-accent), #06b6d4)', 
          transition: 'width 0.1s ease-out', 
          boxShadow: '0 0 12px var(--color-accent)' 
        }}></div>
      </div>

      {/* Banner Sponsor Header dari Firestore - terpisah dari AdSense */}
      <AdBanner slot="header" />

      <Navbar />

      {/* Monetisasi: Leaderboard AdSense di atas artikel */}
      <div className="container" style={{ marginTop: '0px' }}>
        <AdUnit format="leaderboard" />
      </div>

      <main className="container" style={{ position: 'relative', marginTop: '20px', zIndex: 10, paddingBottom: '12px', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '40px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'start' }} className="modern-article-layout">
          
          {/* Main Article Content */}
          <article style={{ minWidth: 0, overflow: 'visible', padding: 0, boxSizing: 'border-box', width: '100%' }}>
            {isEditorialPreview && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.18), rgba(234, 88, 12, 0.18))',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                color: '#e9d5ff',
                padding: '14px 18px',
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                lineHeight: 1.5
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>🔒</span>
                <div>
                  <strong>{t('article.editorial_preview') || (lang === 'zh' ? '编辑预览模式:' : lang === 'en' ? 'Editorial Preview Mode:' : 'Mode Pratinjau Redaksi:')}</strong>{' '}
                  {lang === 'zh'
                    ? `本文处于 ${article.status === 'scheduled' ? `预排 (${article.scheduledAt ? article.scheduledAt.replace('T', ' ') : '尚未发布'})` : '草稿'} 状态，尚未公开发布。`
                    : lang === 'en'
                    ? `This article is in ${article.status === 'scheduled' ? `Scheduled (${article.scheduledAt ? article.scheduledAt.replace('T', ' ') : 'Not yet published'})` : 'Draft'} status and is not yet publicly published.`
                    : `Artikel ini berstatus ${article.status === 'scheduled' ? `Terjadwal (${article.scheduledAt ? article.scheduledAt.replace('T', ' ') : 'Belum Tayang'})` : 'Draf'}. Artikel ini belum diterbitkan untuk umum.`}
                </div>
              </div>
            )}
            
            {/* Breadcrumb Schema.org Structured Data */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Beranda",
                      "item": "https://bedainnews.com/"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": article.category || "Berita",
                      "item": `https://bedainnews.com/cari?q=${encodeURIComponent(article.category || 'Berita')}`
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": article.title,
                      "item": `https://bedainnews.com/article/${article.slug}`
                    }
                  ]
                })
              }}
            />

            {/* Visual Breadcrumbs Navigation */}
            <nav aria-label="breadcrumb" style={{ marginBottom: '24px' }}>
              <ol style={{ 
                display: 'flex', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '8px', 
                listStyle: 'none', 
                padding: '10px 16px', 
                margin: 0,
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                fontWeight: 600
              }}>
                <li style={{ display: 'flex', alignItems: 'center' }}>
                  <Link href="/" 
                    style={{ 
                      color: 'var(--color-text-secondary)', 
                      textDecoration: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                  >
                    <Home size={14} style={{ opacity: 0.8 }} />
                    <span>{t('navigation.home')}</span>
                  </Link>
                </li>
                
                <li style={{ display: 'flex', alignItems: 'center', color: 'var(--color-border)' }}>
                  <ChevronRight size={14} style={{ opacity: 0.6 }} />
                </li>
                
                <li style={{ display: 'flex', alignItems: 'center' }}>
                  <Link href={`/cari?q=${encodeURIComponent(article.category || 'Berita')}`}
                    style={{ 
                      color: 'var(--color-accent)', 
                      textDecoration: 'none', 
                      fontWeight: 700,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    {getCategoryLabel(article.category)}
                  </Link>
                </li>
                
                <li style={{ display: 'flex', alignItems: 'center', color: 'var(--color-border)' }}>
                  <ChevronRight size={14} style={{ opacity: 0.6 }} />
                </li>
                
                <li style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: 'var(--color-text-primary)', 
                  fontWeight: 600,
                  maxWidth: '320px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: 0.9
                }}>
                  <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayArticle.title}>
                    {displayArticle.title}
                  </span>
                </li>
              </ol>
            </nav>

            {/* International Visitor AI Translation Banner */}
            {showBanner && detectedLang !== 'id' && !translatedArticle && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(29, 78, 216, 0.25) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '12px',
                padding: '12px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'var(--color-accent, #2563eb)', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Reading from outside Indonesia?
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Translate this article into <strong>{LANG_NAMES[detectedLang] || detectedLang}</strong> automatically with AI.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    disabled={translating}
                    onClick={() => triggerTranslation(detectedLang)}
                    style={{
                      background: 'var(--color-accent, #2563eb)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: translating ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
                    }}
                  >
                    <Sparkles size={14} />
                    {translating ? 'Translating...' : `Translate (${detectedLang.toUpperCase()})`}
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px'
                    }}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* AI Multi-Language Switcher Toolbar for Article */}
            <div 
              className="article-ai-translate-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: 'var(--color-bg-secondary, #1a1a1f)',
                border: '1px solid var(--color-border, #2a2a30)',
                borderRadius: '12px',
                padding: '10px 16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <Sparkles size={16} color="var(--color-accent, #2563eb)" />
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {lang === 'zh' ? '新闻AI翻译:' : lang === 'en' ? 'News Translation (AI):' : 'Alih Bahasa Berita (AI):'}
                </span>
                {translating && (
                  <span style={{ fontSize: '12px', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <span className="spinner-small" style={{ width: '12px', height: '12px' }}></span>
                    {lang === 'zh' ? '正在翻译中...' : lang === 'en' ? 'Translating...' : 'Sedang menerjemahkan...'}
                  </span>
                )}
              </div>
              <div className="translate-options-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[
                  { code: 'id', label: '🇮🇩 Asli (ID)' },
                  { code: 'en', label: '🇺🇸 English' },
                  { code: 'zh', label: '🇨🇳 中文' }
                ].map(item => {
                  const isActive = (currentTargetLang || lang) === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={translating}
                      onClick={() => {
                        changeLanguage(item.code);
                        if (item.code === 'id') {
                          resetTranslation();
                        } else {
                          triggerTranslation(item.code);
                        }
                      }}
                      style={{
                        background: isActive ? 'var(--color-accent, #2563eb)' : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                        border: isActive ? '1px solid var(--color-accent, #2563eb)' : '1px solid var(--color-border, #333)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: isActive ? 800 : 500,
                        cursor: translating ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{item.label}</span>
                      {isActive && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {translating && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(168, 85, 247, 0.12))',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '10px',
                padding: '8px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: 'var(--color-text-primary)'
              }}>
                <Sparkles size={15} color="var(--color-accent)" />
                <span>
                  {lang === 'zh'
                    ? 'AI 正在为您将全文翻译为中文...'
                    : lang === 'en'
                    ? 'AI is translating the full article into English...'
                    : 'AI sedang menerjemahkan artikel...'}
                </span>
              </div>
            )}

            {/* Hero Image Section & Meta */}
            {videoData ? (
              <>
                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px 0', letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
                  {displayArticle.title}
                </h1>
                
                {/* Meta Author & Date & Reading Time */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{t('article.contributor')}: {article.contributorName || article.author?.name || t('article.editorial')}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>{t('article.editor')}: {t('article.editorial')}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
                    <Calendar size={14} /> {formatDate(article.publishedAt || article.createdAt)}
                  </div>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)' }}>
                    <Clock size={14} /> {lang === 'zh' ? '预计' : lang === 'en' ? 'Est.' : 'Estimasi'} {readingTimeMinutes} {t('article.readTime')}
                  </div>
                </div>

                {/* Horizontal Social Share */}
                <div className="sticky-share-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="share-icon-btn" onClick={() => handleReaction('like')} title={likeTooltip} style={{ background: reaction === 'like' ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: reaction === 'like' ? '1px solid var(--color-accent)' : 'none', color: reaction === 'like' ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', gap: '6px' }}>
                    <ThumbsUp size={18} fill={reaction === 'like' ? 'currentColor' : 'none'} />
                    <span className="share-count-text" style={{ fontSize: '13px', fontWeight: 600 }}>{reactionCounts.like || 0}</span>
                  </button>
                  <button className="share-icon-btn" onClick={() => {
                      const el = document.getElementById('comment-section-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else setShowCommentModal(true);
                    }} title={commentTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', position: 'relative' }}>
                    <MessageSquare size={18} />
                    <div style={{ position: 'absolute', top: '0px', right: '2px', background: 'var(--color-accent)', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-bg-primary)', padding: '0 4px' }}>
                      {realCommentCount}
                    </div>
                  </button>
                  <button className="share-icon-btn" onClick={toggleBookmark} title={bookmarkTooltip} style={{ background: isBookmarked ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: isBookmarked ? '1px solid var(--color-accent)' : 'none', color: isBookmarked ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button className="share-icon-btn" onClick={handleShare} disabled={isSharing} title={shareTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: isSharing ? 0.6 : 1 }}>
                    <Share2 size={18} />
                  </button>
                  <button className="share-icon-btn" onClick={handleCopyLink} title={copyTooltip} style={{ background: 'transparent', border: 'none', color: copied ? '#4ade80' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {copied ? <Check size={18} /> : <Link2 size={18} />}
                  </button>
                  <button 
                    className="share-icon-btn font-size-toggle-btn" 
                    onClick={toggleFontSize} 
                    title={fontSizeTooltip} 
                    style={{ 
                      background: fontSize !== 'normal' ? 'rgba(230, 32, 32, 0.12)' : 'transparent', 
                      border: fontSize !== 'normal' ? '1px solid var(--color-accent)' : 'none', 
                      color: fontSize !== 'normal' ? 'var(--color-accent)' : 'var(--color-text-primary)', 
                      cursor: 'pointer', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      justifyContent: 'center', 
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                      marginLeft: 'auto' 
                    }}
                  >
                    <Type size={18} />
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                      {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
                    </span>
                  </button>
                </div>

                {/* Video Wrapper */}
                {videoData?.type === 'youtube' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '32px', background: 'var(--color-bg-secondary)', position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                    <iframe 
                      src={`https://www.youtube.com/embed/${videoData.id}?autoplay=1&mute=0`} 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      title={article.title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px' }}
                    ></iframe>
                  </div>
                )}
                {videoData?.type === 'facebook' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden', padding: '16px 0' }}>
                    <div className="fb-video" data-href={videoData.url} data-width="auto" data-show-text="false"></div>
                    <Script src="https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v18.0" strategy="lazyOnload" crossOrigin="anonymous" />
                  </div>
                )}
                {videoData?.type === 'tiktok' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    {videoData.id ? (
                      <>
                        <blockquote className="tiktok-embed" cite={videoData.url} data-video-id={videoData.id} style={{ maxWidth: '605px', minWidth: '325px', margin: 0 }}>
                          <section></section>
                        </blockquote>
                        <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
                      </>
                    ) : (
                       <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', width: '100%' }}>
                         <a href={videoData.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Tonton Video di TikTok</a>
                       </div>
                    )}
                  </div>
                )}
              </>
            ) : article.coverImage || article.imageUrl ? (
              <>
                {/* Breadcrumb / Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--color-accent)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {getCategoryLabel(article.category)}
                  </span>
                </div>
                
                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px 0', letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
                  {displayArticle.title}
                </h1>
                
                {/* Meta Author & Date & Reading Time */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{t('article.contributor')}: {article.contributorName || article.author?.name || t('article.editorial')}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>{t('article.editor')}: {t('article.editorial')}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
                    <Calendar size={14} /> {formatDate(article.publishedAt || article.createdAt)}
                  </div>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)' }}>
                    <Clock size={14} /> {readingTimeMinutes} {t('article.readTime')}
                  </div>
                </div>

                {/* Horizontal Social Share */}
                <div className="sticky-share-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="share-icon-btn" onClick={() => handleReaction('like')} title={likeTooltip} style={{ background: reaction === 'like' ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: reaction === 'like' ? '1px solid var(--color-accent)' : 'none', color: reaction === 'like' ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', gap: '6px' }}>
                    <ThumbsUp size={18} fill={reaction === 'like' ? 'currentColor' : 'none'} />
                    <span className="share-count-text" style={{ fontSize: '13px', fontWeight: 600 }}>{reactionCounts.like || 0}</span>
                  </button>
                  <button className="share-icon-btn" onClick={() => {
                      const el = document.getElementById('comment-section-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else setShowCommentModal(true);
                    }} title={commentTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', position: 'relative' }}>
                    <MessageSquare size={18} />
                    <div style={{ position: 'absolute', top: '0px', right: '2px', background: 'var(--color-accent)', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-bg-primary)', padding: '0 4px' }}>
                      {realCommentCount}
                    </div>
                  </button>
                  <button className="share-icon-btn" onClick={toggleBookmark} title={bookmarkTooltip} style={{ background: isBookmarked ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: isBookmarked ? '1px solid var(--color-accent)' : 'none', color: isBookmarked ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button className="share-icon-btn" onClick={handleShare} disabled={isSharing} title={shareTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: isSharing ? 0.6 : 1 }}>
                    <Share2 size={18} />
                  </button>
                  <button className="share-icon-btn" onClick={handleCopyLink} title={copyTooltip} style={{ background: 'transparent', border: 'none', color: copied ? '#4ade80' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {copied ? <Check size={18} /> : <Link2 size={18} />}
                  </button>
                  <button 
                    className="share-icon-btn font-size-toggle-btn" 
                    onClick={toggleFontSize} 
                    title={fontSizeTooltip} 
                    style={{ 
                      background: fontSize !== 'normal' ? 'rgba(230, 32, 32, 0.12)' : 'transparent', 
                      border: fontSize !== 'normal' ? '1px solid var(--color-accent)' : 'none', 
                      color: fontSize !== 'normal' ? 'var(--color-accent)' : 'var(--color-text-primary)', 
                      cursor: 'pointer', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      justifyContent: 'center', 
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                      marginLeft: 'auto' 
                    }}
                  >
                    <Type size={18} />
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                      {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
                    </span>
                  </button>
                </div>

                {/* Hero Image */}
                <div className="article-main-image-wrapper hero-media-mobile-full" style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '32px', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
                  <img 
                    src={article.coverImage || article.imageUrl} 
                    alt={article.title} 
                    style={{ width: '100%', height: 'auto', display: 'block' }} 
                  />
                </div>
              </>
            ) : (
              <>
                {/* Fallback for no image */}
                 <span style={{ background: 'var(--color-accent)', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                   {getCategoryLabel(article.category)}
                 </span>
                 <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.25, margin: '12px 0', fontFamily: 'var(--font-heading)' }}>
                   {displayArticle.title}
                   {translating && <span style={{display: 'inline-block', marginLeft: '10px', fontSize: '0.9rem', color: 'var(--color-accent)'}} className="spinner-small" title={t('article.translate')}></span>}
                 </h1>
                 <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                    <span>{t('article.contributor') || 'Kontributor'}: {article.contributorName || article.author?.name || t('article.editorial')}</span>
                    <span>•</span>
                    <span>{t('article.editor') || 'Editor'}: {t('article.editorial')}</span>
                    <span>•</span>
                    <span suppressHydrationWarning>{formatDate(article.publishedAt || article.createdAt)}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} /> {readingTimeMinutes} {t('article.readTime')}
                    </span>
                 </div>

                 {/* Horizontal Social Share */}
                 <div className="sticky-share-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                   <button className="share-icon-btn" onClick={() => handleReaction('like')} title={likeTooltip} style={{ background: reaction === 'like' ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: reaction === 'like' ? '1px solid var(--color-accent)' : 'none', color: reaction === 'like' ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', gap: '6px' }}>
                     <ThumbsUp size={18} fill={reaction === 'like' ? 'currentColor' : 'none'} />
                     <span className="share-count-text" style={{ fontSize: '13px', fontWeight: 600 }}>{reactionCounts.like || 0}</span>
                   </button>
                   <button className="share-icon-btn" onClick={() => {
                       const el = document.getElementById('comment-section-anchor');
                       if (el) el.scrollIntoView({ behavior: 'smooth' });
                       else setShowCommentModal(true);
                     }} title={commentTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', position: 'relative' }}>
                     <MessageSquare size={18} />
                     <div style={{ position: 'absolute', top: '0px', right: '2px', background: 'var(--color-accent)', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-bg-primary)', padding: '0 4px' }}>
                       {realCommentCount}
                     </div>
                   </button>
                   <button className="share-icon-btn" onClick={toggleBookmark} title={bookmarkTooltip} style={{ background: isBookmarked ? 'rgba(37, 99, 235, 0.15)' : 'transparent', border: isBookmarked ? '1px solid var(--color-accent)' : 'none', color: isBookmarked ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                     <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                   </button>
                   <button className="share-icon-btn" onClick={handleShare} disabled={isSharing} title={shareTooltip} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: isSharing ? 0.6 : 1 }}>
                     <Share2 size={18} />
                   </button>
                   <button className="share-icon-btn" onClick={handleCopyLink} title={copyTooltip} style={{ background: 'transparent', border: 'none', color: copied ? '#4ade80' : 'var(--color-text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                     {copied ? <Check size={18} /> : <Link2 size={18} />}
                   </button>
                    <button 
                      className="share-icon-btn font-size-toggle-btn" 
                      onClick={toggleFontSize} 
                      title={fontSizeTooltip} 
                      style={{ 
                        background: fontSize !== 'normal' ? 'rgba(230, 32, 32, 0.12)' : 'transparent', 
                        border: fontSize !== 'normal' ? '1px solid var(--color-accent)' : 'none', 
                        color: fontSize !== 'normal' ? 'var(--color-accent)' : 'var(--color-text-primary)', 
                        cursor: 'pointer', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        justifyContent: 'center', 
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                        marginLeft: 'auto' 
                      }}
                    >
                      <Type size={18} />
                      <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                        {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
                      </span>
                    </button>
                 </div>
              </>
            )}
            
            {article.imageCaption && !videoData && (
              <div style={{ padding: '0 10px 24px 10px', fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '-20px' }}>
                {article.imageCaption}
              </div>
            )}

            {/* Monetisasi: In-Article Ad Atas */}
            <AdUnit format="in-article" style={{ marginBottom: '32px' }} />
            

            

            {/* AI Text-to-Speech Podcast Audio Player */}
            <div className="tts-widget-container" style={{
              background: isPlayingTTS ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)' : 'var(--color-bg-secondary)',
              border: isPlayingTTS ? '1.5px solid #ef4444' : '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '18px 22px',
              margin: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: isPlayingTTS ? '0 8px 24px rgba(239, 68, 68, 0.15)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <style>{`
                @keyframes soundwave {
                  0% { transform: scaleY(0.4); }
                  100% { transform: scaleY(1.5); }
                }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="tts-widget-icon" style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: isPlayingTTS ? 'linear-gradient(135deg, #ef4444, #a855f7)' : 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isPlayingTTS ? '#fff' : '#ef4444',
                    transition: 'all 0.3s'
                  }}>
                    <Headphones size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tts-widget-title" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        {lang === 'zh' ? 'AI 语音播报' : lang === 'en' ? 'AI Audio Broadcast' : 'Dengarkan Berita AI'}
                      </span>
                      {isPlayingTTS && !ttsPaused && (
                        <span style={{
                          fontSize: '10px',
                          background: '#ef4444',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {lang === 'zh' ? '正在播放' : 'LIVE PLAYING'}
                        </span>
                      )}
                      {isPlayingTTS && ttsPaused && (
                        <span style={{
                          fontSize: '10px',
                          background: '#eab308',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700
                        }}>
                          {lang === 'zh' ? '已暂停' : 'PAUSED'}
                        </span>
                      )}
                    </div>
                    <div className="tts-widget-desc" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {isPlayingTTS ? (
                        ttsPaused 
                          ? (lang === 'zh' ? '播报已暂停，点击播放继续。' : lang === 'en' ? 'Narration paused. Click Play to continue.' : 'Narasi dijeda. Klik Play untuk melanjutkan.')
                          : (lang === 'zh' ? 'AI 正在为您朗读本文...' : lang === 'en' ? 'AI narrator is reading this article for you...' : 'Narator AI sedang membacakan artikel ini untuk Anda...')
                      ) : (
                        lang === 'zh' ? '在忙碌或通勤时像收听播客一样收听文章。' : lang === 'en' ? 'Listen to this article like a podcast while on the move.' : 'Dengarkan isi artikel layaknya podcast saat Anda sedang beraktivitas.'
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="tts-widget-play-btn"
                    onClick={handleToggleTTS}
                    style={{
                      background: isPlayingTTS ? 'var(--color-accent)' : 'linear-gradient(135deg, #ef4444, #e11d48)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isPlayingTTS && !ttsPaused ? <Pause size={16} /> : <Play size={16} />}
                    {isPlayingTTS && !ttsPaused 
                      ? (lang === 'zh' ? '暂停' : lang === 'en' ? 'Pause' : 'Jeda Suara')
                      : isPlayingTTS && ttsPaused 
                      ? (lang === 'zh' ? '继续' : lang === 'en' ? 'Resume' : 'Lanjutkan')
                      : (lang === 'zh' ? '播放声音' : lang === 'en' ? 'Play Audio' : 'Putar Suara')
                    }
                  </button>

                  {isPlayingTTS && (
                    <button
                      onClick={handleStopTTS}
                      title={lang === 'zh' ? '停止' : lang === 'en' ? 'Stop' : 'Berhenti'}
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Square size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Controls bar: speed & soundwave visualizer */}
              <div className="tts-widget-controls" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {lang === 'zh' ? '语速:' : lang === 'en' ? 'Speed:' : 'Kecepatan:'}
                  </span>
                  {[0.8, 1.0, 1.25, 1.5].map(rate => (
                    <button
                      className="tts-widget-speed-btn"
                      key={rate}
                      onClick={() => handleChangeRate(rate)}
                      style={{
                        background: ttsRate === rate ? '#ef4444' : 'transparent',
                        color: ttsRate === rate ? '#fff' : 'var(--color-text-secondary)',
                        border: ttsRate === rate ? 'none' : '1px solid var(--color-border)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {availableVoices.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {lang === 'zh' ? '声音:' : lang === 'en' ? 'Voice:' : 'Suara:'}
                    </span>
                    <select
                      className="tts-widget-voice-select"
                      value={ttsVoiceIndex}
                      onChange={(e) => {
                        setTtsVoiceIndex(Number(e.target.value));
                        if (isPlayingTTS) handleStopTTS();
                      }}
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {availableVoices.map((v, idx) => (
                        <option key={idx} value={idx}>
                          {v.name.replace(/Microsoft|Google/g, '').trim()} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isPlayingTTS && !ttsPaused && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          height: `${10 + (i % 3) * 6}px`,
                          background: '#ef4444',
                          borderRadius: '2px',
                          animation: `soundwave 0.8s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Excerpt Lead (Hanya untuk artikel biasa, bukan artikel video) */}
            {(!videoId && !videoData?.embedUrl && (displayArticle?.seoDescription || displayArticle?.excerpt || cleanText.length > 50)) && (
              <div style={{
                fontSize: '1.05rem',
                fontWeight: 500,
                lineHeight: 1.6,
                color: 'var(--color-text-primary)',
                fontStyle: 'italic',
                padding: '16px 20px',
                margin: '8px 0 24px 0',
                background: 'var(--color-bg-secondary)',
                borderLeft: '4px solid var(--color-accent)',
                borderRadius: '0 12px 12px 0',
                fontFamily: 'var(--font-heading)',
                overflowWrap: 'break-word'
              }}>
                {(() => {
                  let text = (displayArticle?.seoDescription || displayArticle?.excerpt || '').trim();
                  if (!text && cleanText.length > 50) {
                    let cleaned = cleanText.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
                    let shortText = cleaned.substring(0, 220);
                    let lastSpace = shortText.lastIndexOf(' ');
                    text = lastSpace > 0 ? shortText.substring(0, lastSpace) + '...' : shortText + '...';
                  }
                  return text.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
                })()}
              </div>
            )}

            {/* Poin Penting / TL;DR (3 Detik Paham) */}
            <ArticleKeyPoints article={displayArticle} />

            {/* Rich Content Text */}
            <div
              className="article-content modern-content ql-editor"
              style={{
                '--article-font-size': getFontSizeValue(),
                fontSize: getFontSizeValue(),
                lineHeight: 1.85,
                color: 'var(--color-text-primary)',
                padding: 0,
                transition: 'font-size 0.25s ease',
                fontFamily: 'Inter, system-ui, sans-serif',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'visible'
              }}
            >
              {contentBlocks.map((block, index) => {
                const isRelatedInsertPos = index === (contentBlocks.length >= 3 ? 1 : 0);
                const isAdInsertPos1 = index === 2;
                const isAdInsertPos2 = index === 5;
                
                // Helper untuk mereplace kode "[B]" menjadi signature cap redaksi Bedain News tanpa merusak HTML tags
                const replaceBWithLogo = (htmlStr) => {
                  if (!htmlStr) return htmlStr;
                  const logoUrl = settings?.faviconUrl || settings?.logoUrl || '';
                  if (logoUrl) {
                    return htmlStr.replace(/(<[^>]+>)|(\[B\])/g, (match, tag, letterB) => {
                      if (tag) return tag;
                      if (letterB) {
                        return `<img src="${logoUrl}" alt="Bedain News" class="inline-b-logo" onerror="this.style.display='none'" />`;
                      }
                      return match;
                    });
                  }
                  return htmlStr.replace(/(<[^>]+>)|(\[B\])/g, (match, tag, letterB) => {
                    if (tag) return tag;
                    if (letterB) {
                      return `<span class="inline-b-badge" title="Bedain News">B</span>`;
                    }
                    return match;
                  });
                };
                
                return (
                  <React.Fragment key={index}>
                    <div 
                      className="article-block" 
                      style={{
                        '--article-font-size': getFontSizeValue(),
                        fontSize: getFontSizeValue(),
                        transition: 'font-size 0.25s ease'
                      }}
                      dangerouslySetInnerHTML={{ __html: replaceBWithLogo(block) }} 
                    />
                    
                    {/* Inject Baca Juga (Interactive Card) */}
                    {isRelatedInsertPos && relatedArticles.length > 0 && (
                      <div className="inline-related-articles" style={{ margin: '40px 0', padding: '16px 12px', background: 'var(--color-bg-secondary)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)' }}></div>
                          <span style={{ fontSize: '14px', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('article.readAlso') || (lang === 'zh' ? '相关阅读' : lang === 'en' ? 'READ ALSO' : 'BACA JUGA')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {relatedArticles.slice(0, 2).map(rel => (
                            <Link key={rel.id} href={`/article/${rel.slug || rel.id}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', background: 'var(--color-bg-primary)', padding: '12px', borderRadius: '12px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', alignItems: 'center' }} className="no-underline" onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)' }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                <LazyImage src={getArticleCardImage(rel)} alt={rel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <VideoBadge article={rel} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4, textDecoration: 'none' }}>
                                  {translateArticleTitle(rel)}
                                </h4>
                                <span suppressHydrationWarning style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><Clock size={12}/> {timeAgo(rel.publishedAt || rel.createdAt)}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monetisasi: In-Article Ads dynamically placed */}
                    {isAdInsertPos1 && (
                      <AdBanner slot="article" />
                    )}
                    {isAdInsertPos2 && (
                      <AdUnit format="in-article" variant="community" style={{ margin: '32px 0' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Google Reader Revenue Manager (Inline CTA) */}
            <div style={{ margin: '40px 0', width: '100%', maxWidth: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }} className="rrm-inline-cta-container">
              <div rrm-inline-cta="283941b3-47c7-4436-9b36-25f35b10f598" style={{ maxWidth: '100%' }}></div>
            </div>

            {/* Author / Editor Info at bottom */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '14px', color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <span><span style={{ color: 'var(--color-text-secondary)' }}>{t('article.contributor') || (lang === 'zh' ? '撰稿人' : lang === 'en' ? 'Contributor' : 'Kontributor')}:</span> <strong>{article.contributorName || article.author?.name || t('article.editorial')}</strong></span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span><span style={{ color: 'var(--color-text-secondary)' }}>{t('article.editor') || (lang === 'zh' ? '编辑' : lang === 'en' ? 'Editor' : 'Editor')}:</span> <strong>{t('article.editorial') || (lang === 'zh' ? 'Bedain 编辑部' : lang === 'en' ? 'Bedain Editorial' : 'Redaksi Bedain')}</strong></span>
            </div>

            {/* Tags Section */}
            {Array.isArray(displayArticle.tags) && displayArticle.tags.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={14} /> {lang === 'zh' ? '话题' : lang === 'en' ? 'TOPICS' : 'TOPIK'}:
                </span>
                {displayArticle.tags.map((tag, idx) => (
                  <span key={idx} style={{
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }} className="tag-hover">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Polling Cepat Isu Hangat Komunitas */}
            <ArticlePoll article={article} />

            {/* Kotak Donasi / Traktir Kopi Redaksi (Saweria & Trakteer) */}
            <DonationBox />

            {/* Google News & WhatsApp Channel CTA Box */}
            <div className="google-news-cta-container" style={{
              margin: '20px 0 16px',
              padding: '24px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}>
              <a 
                href={settings?.googleNewsUrl || "https://news.google.com/search?q=bedainnews.com&hl=id&gl=ID&ceid=ID%3Aid"} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'var(--color-bg-primary)',
                  border: '1.5px solid #1a73e8',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 2px 10px rgba(26, 115, 232, 0.1)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                className="google-news-preferred-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {lang === 'zh' ? (
                      <>在 Google 上将 <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-accent)' }}>{settings?.siteName || 'Bedain News'}</span> 添加为首选新闻源</>
                    ) : lang === 'en' ? (
                      <>Add <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-accent)' }}>{settings?.siteName || 'Bedain News'}</span> as a preferred source on Google</>
                    ) : (
                      <>Tambahkan <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-accent)' }}>{settings?.siteName || 'Bedain News'}</span> sebagai sumber favorit di Google</>
                    )}
                  </span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#1a73e8', lineHeight: 1 }}>+</span>
              </a>

              <div style={{
                textAlign: 'center',
                fontSize: '14.5px',
                color: 'var(--color-text-primary)',
                fontWeight: 600
              }}>
                {lang === 'zh' ? (
                  <>
                    在{' '}
                    <a 
                      href={settings?.googleNewsUrl || "https://news.google.com/search?q=bedainnews.com&hl=zh&gl=CN"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      Google News
                    </a>
                    {' '}与{' '}
                    <a 
                      href={settings?.waChannelUrl || (settings?.contactWhatsapp ? `https://api.whatsapp.com/send?phone=${settings.contactWhatsapp}&text=Halo%20Redaksi%20Bedain%20News` : "https://whatsapp.com")} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WA Channel
                    </a>
                    {' '}查看更多新闻与文章
                  </>
                ) : lang === 'en' ? (
                  <>
                    Explore more news and articles on{' '}
                    <a 
                      href={settings?.googleNewsUrl || "https://news.google.com/search?q=bedainnews.com&hl=en&gl=US"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      Google News
                    </a>
                    {' '}and{' '}
                    <a 
                      href={settings?.waChannelUrl || (settings?.contactWhatsapp ? `https://api.whatsapp.com/send?phone=${settings.contactWhatsapp}&text=Halo%20Redaksi%20Bedain%20News` : "https://whatsapp.com")} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WA Channel
                    </a>
                  </>
                ) : (
                  <>
                    Cek Berita dan Artikel yang lain di{' '}
                    <a 
                      href={settings?.googleNewsUrl || "https://news.google.com/search?q=bedainnews.com&hl=id&gl=ID&ceid=ID%3Aid"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      Google News
                    </a>
                    {' '}dan{' '}
                    <a 
                      href={settings?.waChannelUrl || (settings?.contactWhatsapp ? `https://api.whatsapp.com/send?phone=${settings.contactWhatsapp}&text=Halo%20Redaksi%20Bedain%20News` : "https://whatsapp.com")} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#e63946', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WA Channel
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Modern Reaction Widget */}
            {(() => {
              const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0) || 1;
              const reactionItems = [
                { type: 'like', emoji: '👍', label: lang === 'zh' ? '喜欢' : lang === 'en' ? 'Like' : 'Suka', count: reactionCounts.like || 0, color: '#2563eb' },
                { type: 'insightful', emoji: '💡', label: lang === 'zh' ? '有益' : lang === 'en' ? 'Insightful' : 'Bermanfaat', count: reactionCounts.insightful || 0, color: '#10b981' },
                { type: 'fire', emoji: '🔥', label: lang === 'zh' ? '火爆' : lang === 'en' ? 'Fire' : 'Memukau', count: reactionCounts.fire || 0, color: '#f97316' },
                { type: 'love', emoji: '❤️', label: lang === 'zh' ? '感动' : lang === 'en' ? 'Inspiring' : 'Inspiratif', count: reactionCounts.love || 0, color: '#ec4899' },
                { type: 'shock', emoji: '😲', label: lang === 'zh' ? '震惊' : lang === 'en' ? 'Shocking' : 'Mengejutkan', count: reactionCounts.shock || 0, color: '#8b5cf6' },
                { type: 'sad', emoji: '😢', label: lang === 'zh' ? '难过' : lang === 'en' ? 'Sad' : 'Sedih', count: reactionCounts.sad || 0, color: '#06b6d4' }
              ];

              return (
                <div className="modern-reaction-box">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '10px'
                    }}>
                      ✨ {lang === 'zh' ? '读者反馈' : lang === 'en' ? 'READER REACTIONS' : 'RESPONS PEMBACA'}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>
                      {lang === 'zh' ? '您对这篇文章有何看法？' : lang === 'en' ? 'How do you feel about this article?' : 'Bagaimana reaksi Anda terhadap artikel ini?'}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {lang === 'zh'
                        ? `${totalReactions} 位读者已表达观点`
                        : lang === 'en'
                        ? `${totalReactions} readers have reacted`
                        : `${totalReactions} pembaca telah memberikan respons`}
                    </p>
                  </div>

                  <div className="reaction-cards-grid">
                    {reactionItems.map((item) => {
                      const isSelected = reaction === item.type;
                      const percentage = Math.round((item.count / totalReactions) * 100);

                      return (
                        <button
                          key={item.type}
                          onClick={() => handleReaction(item.type)}
                          className={`reaction-item-card ${isSelected ? 'selected' : ''}`}
                          style={{
                            borderColor: isSelected ? item.color : 'var(--color-border)',
                            background: isSelected ? `${item.color}14` : 'var(--color-bg-primary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.emoji}</span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: isSelected ? item.color : 'var(--color-text-secondary)',
                              background: isSelected ? `${item.color}22` : 'var(--color-bg-secondary)',
                              padding: '2px 6px',
                              borderRadius: '999px'
                            }}>
                              {percentage}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '1px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {item.label}
                            </span>
                            <span style={{ fontSize: '9.5px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                              {item.count} {lang === 'zh' ? '票' : lang === 'en' ? 'votes' : 'suara'}
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                            marginTop: '6px'
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: item.color,
                              borderRadius: '999px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}


            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                  <Flame size={20} color="var(--color-accent)" /> {t('article.readAlso') || (lang === 'zh' ? '相关阅读' : lang === 'en' ? 'Related News' : 'Baca Juga')}
                </h3>
                <div className="related-grid">
                  {relatedArticles.slice(0, 6).map(rel => (
                    <Link key={rel.id}
                      href={`/article/${rel.slug || rel.title?.toLowerCase()?.replace(/\s+/g, '-')}`}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                      }}
                      className="related-card-compact"
                    >
                      {/* Edge-to-edge thumbnail without heavy overlay */}
                      <div style={{ width: '100%', aspectRatio: '16/10', overflow: 'hidden', background: 'var(--color-bg-tertiary)', position: 'relative' }}>
                        <LazyImage
                          src={getArticleCardImage(rel)}
                          alt={rel.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                          className="related-img"
                        />
                        <VideoBadge article={rel} />
                      </div>

                      {/* Clean Card Body */}
                      <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          {rel.category && (
                            <div style={{
                              color: 'var(--color-accent)',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.6px',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>{t(`categories.${rel.category?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-')}`) || rel.category}</span>
                            </div>
                          )}
                          <h4
                            style={{
                              margin: 0,
                              fontSize: 'clamp(0.75rem, 3.5vw, 0.9rem)',
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                              lineHeight: 1.35,
                              fontFamily: 'var(--font-heading)',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {translateArticleTitle(rel)}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </article>

          {/* Right Sidebar */}
          <aside className="modern-right-sidebar" style={{ position: 'sticky', top: '188px', alignSelf: 'start', width: '100%' }}>
            <div style={{ transform: `translateY(${parallaxOffset}px)`, transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
              <Sidebar />
              
              {/* Promo Widget Modern */}
              <div style={{
                marginTop: '20px',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: '32px 24px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--color-accent)', filter: 'blur(60px)', opacity: 0.3 }}></div>
                <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '1.4rem', fontFamily: 'var(--font-heading)', position: 'relative', zIndex: 2 }}>BEDAIN<span>NEWS</span> PLUS</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, position: 'relative', zIndex: 2 }}>
                  {lang === 'zh' ? '升级您的阅读体验，享受无广告与独家深度内容。' : lang === 'en' ? 'Upgrade your reading experience with no ads and exclusive premium content.' : 'Tingkatkan pengalaman membaca Anda tanpa iklan dan akses ke konten eksklusif premium.'}
                </p>
                <Link href="/page/tentang-kami" className="btn" style={{ 
                  background: '#fff', 
                  color: '#000', 
                  padding: '12px 24px', 
                  borderRadius: '30px', 
                  textDecoration: 'none', 
                  fontWeight: 700, 
                  fontSize: '13px', 
                  display: 'inline-block',
                  position: 'relative',
                  zIndex: 2,
                  boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
                }}>
                  {lang === 'zh' ? '立即订阅' : lang === 'en' ? 'Subscribe Now' : 'Langganan Sekarang'}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Comment Section */}
      {article && (
        <div style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', marginTop: '12px' }}>
          <div className="container" style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
          <div id="comment-section-anchor">
            <CommentSection articleSlug={slug} articleTitle={article?.title} />
          </div>
          </div>
        </div>
      )}

      {/* Recommended / Related Articles Section Below Comments */}
      {recommendedArticles.length > 0 && (
        <section style={{
          background: 'var(--color-bg-primary)',
          borderTop: '1px solid var(--color-border)',
          padding: '60px 0 72px 0',
          position: 'relative',
          zIndex: 10
        }}>
          <div className="container" style={{ maxWidth: '860px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(230, 57, 70, 0.12)',
                  color: 'var(--color-accent)',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: '10px'
                }}>
                  <Sparkles size={14} /> {lang === 'zh' ? '编辑精选' : lang === 'en' ? 'Editorial Pick' : 'Rekomendasi Redaksi'}
                </div>
                <h2 className="related-news-title">
                  {lang === 'zh' ? '相关新闻与精选推荐' : lang === 'en' ? 'Related News & Top Picks' : 'Berita Terkait & Pilihan Untuk Anda'}
                </h2>
              </div>

              <Link href="/cari?q=semua"
                style={{
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: 'rgba(230, 57, 70, 0.08)'
                }}
              >
                {lang === 'zh' ? '查看全部新闻 →' : lang === 'en' ? 'View All News →' : 'Lihat Semua Berita →'}
              </Link>
            </div>

            {/* Responsive Grid */}
            <div className="bottom-recommended-grid">
              {recommendedArticles.slice(0, 4).map((item, index) => {
                const itemSlug = item.slug || item.title?.toLowerCase().replace(/\s+/g, '-');
                return (
                  <Link key={item.id || index}
                    href={`/article/${itemSlug}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--color-bg-secondary)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
                    }}
                    className="bottom-rec-card"
                  >
                    {/* Cover Image */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      overflow: 'hidden',
                      position: 'relative',
                      background: 'var(--color-bg-tertiary)'
                    }}>
                      <LazyImage
                        src={getArticleCardImage(item)}
                        alt={item.title}
                        className="bottom-rec-img"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease'
                        }}
                      />
                      <VideoBadge article={item} />
                      {item.category && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: '#111827',
                          color: '#fff',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          border: '1px solid rgba(255,255,255,0.15)'
                        }}>
                          {t(`categories.${item.category?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-')}`) || item.category}
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div style={{
                      padding: '18px 18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between'
                    }}>
                      <h3 style={{
                        margin: '0 0 14px 0',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.45,
                        fontFamily: 'var(--font-heading)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {translateArticleTitle(item)}
                      </h3>

                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />

      {/* Share Modal */}
      {/* Floating Next Article Bar when scrolled past 60% */}
      {(() => {
        const nextArt = relatedArticles[0] || recommendedArticles[0];
        if (!nextArt || scrollProgress < 60 || dismissNextArticle) return null;
        const nextSlug = nextArt.slug || nextArt.title?.toLowerCase().replace(/\s+/g, '-');
        return (
          <div
            className="floating-next-article-bar"
            style={{
              position: 'fixed',
              bottom: '84px',
              right: '20px',
              left: '20px',
              maxWidth: '520px',
              margin: '0 auto',
              background: 'rgba(21, 21, 31, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '20px',
              padding: '14px 18px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              zIndex: 900
            }}
          >
            <button
              onClick={() => setDismissNextArticle(true)}
              title="Tutup"
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ✕
            </button>

            <Link href={`/article/${nextSlug}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', flex: 1, overflow: 'hidden' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--color-bg-tertiary)' }}>
                <LazyImage src={getArticleCardImage(nextArt)} alt={nextArt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚡ {lang === 'zh' ? '阅读下一篇' : lang === 'en' ? 'READ NEXT' : 'BACA SELANJUTNYA'}
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                  {translateArticleTitle(nextArt)}
                </h4>
              </div>
            </Link>

            <Link href={`/article/${nextSlug}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
              }}
            >
              <span>{lang === 'zh' ? '继续' : lang === 'en' ? 'Next' : 'Lanjut'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        );
      })()}

      {isClient && showShareModal && createPortal(
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setShowShareModal(false)}>
          <div style={{ 
            background: 'var(--color-bg-secondary)', padding: '28px 24px', borderRadius: '24px', 
            width: '100%', maxWidth: '420px', textAlign: 'center',
            border: '1px solid var(--color-border)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
             {/* Close button top right */}
             <button 
               onClick={() => setShowShareModal(false)}
               aria-label="Tutup"
               style={{
                 position: 'absolute', top: '16px', right: '16px',
                 background: 'var(--color-bg-tertiary)', border: 'none',
                 color: 'var(--color-text-secondary)', width: '32px', height: '32px',
                 borderRadius: '50%', cursor: 'pointer', display: 'flex',
                 alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                 transition: 'all 0.2s'
               }}
             >✕</button>

             <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
               <Share2 size={24} />
             </div>

             <h3 style={{ color: 'var(--color-text-primary)', fontSize: '1.3rem', fontFamily: 'var(--font-heading)', margin: '0 0 6px 0', fontWeight: 800 }}>
               {lang === 'zh' ? '分享此文章' : lang === 'en' ? 'Share this Article' : 'Bagikan Artikel Ini'}
             </h3>
             <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{displayArticle?.title || article?.title}</p>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {/* WhatsApp */}
                 <button 
                   onClick={() => {
                     const publicUrl = getPublicArticleUrl(article);
                     const title = displayArticle?.title || article?.title || 'Bedain News';
                     const desc = displayArticle?.seoDescription || displayArticle?.excerpt || article?.seoDescription || article?.excerpt || '';
                     const shareLead = lang === 'zh' ? '在 Bedain News 阅读更多:' : lang === 'en' ? 'Read more at Bedain News:' : 'Baca selengkapnya di Bedain News:';
                     const shareText = `*${title}*\n\n${desc ? desc + '\n\n' : ''}${shareLead}\n${publicUrl}`;
                     window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
                     setShowShareModal(false);
                   }}
                   style={{ background: '#25D366', color: '#fff', padding: '13px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                 >
                   <span>{lang === 'zh' ? '分享到 WhatsApp' : lang === 'en' ? 'Share to WhatsApp' : 'Bagikan ke WhatsApp'}</span>
                 </button>

                 {/* Telegram */}
                 <button 
                   onClick={() => {
                     const publicUrl = getPublicArticleUrl(article);
                     const title = displayArticle?.title || article?.title || 'Bedain News';
                     window.open(`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(`${title} - Bedain News`)}`, '_blank', 'noopener,noreferrer');
                     setShowShareModal(false);
                   }}
                   style={{ background: '#0088cc', color: '#fff', padding: '13px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                 >
                   <span>{lang === 'zh' ? '分享到 Telegram' : lang === 'en' ? 'Share to Telegram' : 'Bagikan ke Telegram'}</span>
                 </button>

                 {/* Social Media Grid: X, Facebook, LinkedIn */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                   <a 
                     href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(displayArticle?.title || article?.title || 'Bedain News')}&url=${encodeURIComponent(getPublicArticleUrl(article))}`} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     onClick={() => setShowShareModal(false)}
                     style={{ background: '#000', border: '1px solid #333', color: '#fff', padding: '12px 6px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     X (Twitter)
                   </a>
                   <a 
                     href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPublicArticleUrl(article))}`} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     onClick={() => setShowShareModal(false)}
                     style={{ background: '#1877F2', color: '#fff', padding: '12px 6px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     Facebook
                   </a>
                   <a 
                     href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPublicArticleUrl(article))}`} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     onClick={() => setShowShareModal(false)}
                     style={{ background: '#0A66C2', color: '#fff', padding: '12px 6px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     LinkedIn
                   </a>
                 </div>

                 {/* Native OS Share button jika browser mendukung */}
                 {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                   <button 
                     onClick={async () => {
                       try {
                         const publicUrl = getPublicArticleUrl(article);
                         const title = displayArticle?.title || article?.title || 'Bedain News';
                         const text = displayArticle?.seoDescription || displayArticle?.excerpt || article?.seoDescription || article?.excerpt || `${title} - Bedain News`;
                         await navigator.share({ title, text, url: publicUrl });
                         setShowShareModal(false);
                       } catch (e) {
                         if (e && (e.name === 'AbortError' || e.message?.toLowerCase().includes('cancel'))) {
                           return;
                         }
                       }
                     }}
                     style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                     <Share2 size={16} color="var(--color-accent)" />
                     <span>{lang === 'zh' ? '其他系统应用' : lang === 'en' ? 'Other Apps (System)' : 'Aplikasi Lainnya (Sistem)'}</span>
                   </button>
                 )}

                 {/* Copy link button */}
                 <button 
                   onClick={handleCopyLink} 
                   style={{ 
                     background: copied ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-bg-tertiary)', 
                     color: copied ? '#22c55e' : 'var(--color-text-primary)', 
                     border: copied ? '1px solid #22c55e' : '1px solid var(--color-border)',
                     padding: '13px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', 
                     cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                   }}
                 >
                   {copied ? <Check size={18} color="#22c55e" /> : <Link2 size={18} />}
                   <span>{copied ? (lang === 'zh' ? '链接已成功复制!' : lang === 'en' ? 'Link Copied!' : 'Tautan Berhasil Disalin!') : (lang === 'zh' ? '复制链接' : lang === 'en' ? 'Copy Link' : 'Salin Tautan')}</span>
                 </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {showCommentModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }} onClick={() => setShowCommentModal(false)}>
          <div style={{ 
            background: 'var(--color-bg-secondary)', 
            padding: '24px 16px', 
            borderRadius: '24px', 
            width: '90%', 
            maxWidth: '860px', 
            maxHeight: '85vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowCommentModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>
            <CommentSection articleSlug={slug} articleTitle={article?.title} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;

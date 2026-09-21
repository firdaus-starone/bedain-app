"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
; import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, getDocs, limit, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import LazyImage from './LazyImage';
import { getYouTubeId, getArticleCardImage, getArticleVideoData } from '../lib/videoHelpers';
import Script from 'next/script';
import VideoBadge from './VideoBadge';
import AdUnit from './AdUnit';
import AdBanner from './AdBanner';

import Navbar from './Navbar';
import BreakingNews from './BreakingNews';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { ArrowLeft, ArrowRight, Share2, Printer, Eye, Calendar, User, Tag, Check, Type, Heart, ThumbsUp, Flame, MessageSquare, Bookmark, Link2, Sparkles, Clock, Headphones, Play, Pause, Square, Volume2, ChevronRight, Home } from 'lucide-react';
import CommentSection from './CommentSection';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Capacitor } from '@capacitor/core';
// TextToSpeech di-load secara dinamis untuk menghindari SSR error
import { shareArticleWithImage, getPublicArticleUrl, isMobileDevice } from '../lib/shareHelper';



const ArticleDetail = () => {
  const { slug } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // 'normal', 'large', 'xlarge'
  const [reaction, setReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({ like: 142, insightful: 98, fire: 65, love: 110 });
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVoiceIndex, setTtsVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [translating, setTranslating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const { settings } = useSiteSettings();
  
  const displayArticle = article;

  useEffect(() => {
    setIsClient(true);
    window.scrollTo(0, 0);
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'articles'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docData = snap.docs[0];
          const foundArticle = { id: docData.id, ...docData.data() };
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
              const pubDate = data.publishedAt?.toDate ? data.publishedAt.toDate() : (data.publishedAt ? new Date(data.publishedAt) : new Date());
              if (pubDate > new Date()) {
                setError('Artikel ini belum diterbitkan (terjadwal).');
                setLoading(false);
                return;
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
  }, [slug]);

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
    const fetchRelated = async () => {
      try {
        const q = query(collection(db, 'articles'), where('category', '==', article.category), limit(7));
        const snap = await getDocs(q);
        const now = new Date();
        let related = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.id !== article.id && a.title !== article.title)
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        
        // If related articles < 6, fetch from other categories to fill up the slots
        if (related.length < 6) {
          const fallbackQ = query(collection(db, 'articles'), limit(10));
          const fallbackSnap = await getDocs(fallbackQ);
          const fallbackDocs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(a => a.id !== article.id && a.title !== article.title && !related.find(r => r.id === a.id))
            .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
          related = [...related, ...fallbackDocs];
        }
        setRelatedArticles(related.slice(0, 6));
      } catch (e) {
        console.error("Error fetching related:", e);
        setRelatedArticles([]);
      }
    };
    fetchRelated();
  }, [article?.category, article?.id, article?.title]);

  useEffect(() => {
    if (!article?.title) return;
    const fetchRecommended = async () => {
      try {
        const q = query(collection(db, 'articles'), limit(10));
        const snap = await getDocs(q);
        const now = new Date();
        let recs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.id !== article.id && a.title !== article.title)
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        setRecommendedArticles(recs.slice(0, 6));
      } catch (e) {
        console.error("Error fetching recommended:", e);
        setRecommendedArticles([]);
      }
    };
    fetchRecommended();
  }, [article?.id, article?.title]);

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
    if (!isMobileDevice()) {
      setShowShareModal(true);
      return;
    }
    setIsSharing(true);
    const success = await shareArticleWithImage(article);
    setIsSharing(false);
    if (!success) {
      setShowShareModal(true);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = getPublicArticleUrl(article);
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFontSize = () => {
    if (fontSize === 'normal') setFontSize('large');
    else if (fontSize === 'large') setFontSize('xlarge');
    else setFontSize('normal');
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
          setTtsVoiceIndex(0);
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

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'id-ID';
    utterance.rate = ttsRate;
    const selectedVoice = availableVoices[ttsVoiceIndex];
    if (selectedVoice && (selectedVoice.lang.toLowerCase().includes('id') || selectedVoice.name.toLowerCase().includes('indonesia'))) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsPlayingTTS(true);
      setTtsPaused(false);
    };

    utterance.onend = () => {
      setIsPlayingTTS(false);
      setTtsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlayingTTS(false);
      setTtsPaused(false);
    };

    synth.speak(utterance);
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
    if (!article?.id) return;
    const oldReaction = reaction;
    
    if (oldReaction === type) {
      setReaction(null);
      setReactionCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 1) - 1) }));
      try {
        localStorage.removeItem(`reaction_${article.id}`);
        await updateDoc(doc(db, 'articles', article.id), {
          [`reactions.${type}`]: increment(-1)
        });
      } catch (err) { /* ignore */ }
    } else {
      if (oldReaction) {
        setReactionCounts(prev => ({ ...prev, [oldReaction]: Math.max(0, (prev[oldReaction] || 1) - 1) }));
        try {
          await updateDoc(doc(db, 'articles', article.id), {
            [`reactions.${oldReaction}`]: increment(-1)
          });
        } catch (err) { /* ignore */ }
      }
      setReaction(type);
      setReactionCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
      try {
        localStorage.setItem(`reaction_${article.id}`, type);
        await updateDoc(doc(db, 'articles', article.id), {
          [`reactions.${type}`]: increment(1)
        });
      } catch (err) { /* ignore */ }
    }
  };

  const toggleBookmark = () => {
    if (!article) return;
    try {
      const stored = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
      const existsIndex = stored.findIndex(item => item.id === article.id || item.slug === article.slug);
      let updated;
      if (existsIndex >= 0) {
        updated = stored.filter((_, idx) => idx !== existsIndex);
        setIsBookmarked(false);
      } else {
        updated = [
          {
            id: article.id,
            slug: article.slug,
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
    if (fontSize === 'large') return '1.2rem';
    if (fontSize === 'xlarge') return '1.35rem';
    return '1.08rem';
  };

  const formatDate = (val) => {
    if (!val) return 'Hari ini';
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB';
      } catch (e) {}
    }
    if (val && typeof val.seconds === 'number') {
      try {
        const d = new Date(val.seconds * 1000);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';
        }
      } catch (e) {}
    }
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB';
      }
    } catch (e) {}
    return 'Hari ini';
  };

  const timeAgo = (val) => {
    if (!val) return 'Baru saja';
    let date = null;
    if (typeof val.toDate === 'function') {
      try { date = val.toDate(); } catch (e) {}
    } else if (val && typeof val.seconds === 'number') {
      try { date = new Date(val.seconds * 1000); } catch (e) {}
    } else {
      try { date = new Date(val); } catch (e) {}
    }
    if (!date || isNaN(date.getTime())) return 'Baru saja';

    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    // Fallback if future date
    if (seconds < 0) return 'Baru saja';
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " tahun lalu";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " bulan lalu";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " hari lalu";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " jam lalu";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " menit lalu";
    return Math.floor(seconds) + " detik lalu";
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
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Memuat berita terkini untuk Anda...</p>
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
            <h1 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Berita Tidak Ditemukan</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
              {error || 'Maaf, artikel yang Anda cari tidak tersedia atau sedang diperbarui.'}
            </p>
            <Link href="/" className="btn" style={{ background: 'linear-gradient(135deg, var(--color-accent), #ff5252)', color: 'var(--color-text-primary)', padding: '14px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: 600, display: 'inline-block', boxShadow: '0 8px 16px rgba(230,57,70,0.3)' }}>
              Kembali ke Beranda
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
      return ['<p>Konten berita sedang dimuat...</p>'];
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
                    <span>Beranda</span>
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
                    {article.category || 'Berita'}
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

            {/* Hero Image Section & Meta */}
            {videoData ? (
              <div style={{ marginBottom: '32px' }}>
                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px 0', letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
                  {displayArticle.title}
                </h1>
                
                {/* Meta Author & Date & Reading Time */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{article.author?.name || 'Redaksi Bedain'}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>Admin Redaksi</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
                    <Calendar size={14} /> {formatDate(article.publishedAt || article.createdAt)}
                  </div>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)' }}>
                    <Clock size={14} /> Estimasi {readingTimeMinutes} menit baca
                  </div>
                </div>

                {/* Video Wrapper */}
                {videoData.type === 'youtube' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '24px', background: 'var(--color-bg-secondary)', position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
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
                {videoData.type === 'facebook' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden', padding: '16px 0' }}>
                    <div className="fb-video" data-href={videoData.url} data-width="auto" data-show-text="false"></div>
                    <Script src="https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v18.0" strategy="lazyOnload" crossOrigin="anonymous" />
                  </div>
                )}
                {videoData.type === 'tiktok' && (
                  <div className="article-main-video-wrapper hero-media-mobile-full" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
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
              </div>
            ) : article.coverImage || article.imageUrl ? (
              <div style={{ marginBottom: '32px' }}>
                {/* Breadcrumb / Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--color-accent)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {article.category || 'Berita'}
                  </span>
                </div>
                
                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px 0', letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
                  {displayArticle.title}
                </h1>
                
                {/* Meta Author & Date & Reading Time */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{article.author?.name || 'Redaksi Bedain'}</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>Admin Redaksi</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
                    <Calendar size={14} /> {formatDate(article.publishedAt || article.createdAt)}
                  </div>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)' }}>
                    <Clock size={14} /> Estimasi {readingTimeMinutes} menit baca
                  </div>
                </div>

                {/* Hero Image */}
                <div className="article-main-image-wrapper hero-media-mobile-full" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px', marginBottom: '16px', background: 'var(--color-bg-secondary)', position: 'relative' }}>
                  <Image 
                    src={article.coverImage || article.imageUrl} 
                    alt={article.title} 
                    fill
                    style={{ objectFit: 'cover' }} 
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '32px' }}>
                {/* Fallback for no image */}
                 <span style={{ background: 'var(--color-accent)', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                   {article.category || 'Berita'}
                 </span>
                 <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.25, margin: '12px 0', fontFamily: 'var(--font-heading)' }}>
                   {displayArticle.title}
                   {translating && <span style={{display: 'inline-block', marginLeft: '10px', fontSize: '0.9rem', color: 'var(--color-accent)'}} className="spinner-small" title="Menerjemahkan ke bahasa lokal..."></span>}
                 </h1>
                 <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <span>{article.author?.name || 'Redaksi'}</span>
                    <span>•</span>
                    <span suppressHydrationWarning>{formatDate(article.publishedAt || article.createdAt)}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} /> {readingTimeMinutes} menit baca
                    </span>
                 </div>
              </div>
            )}
            
            {article.imageCaption && !videoData && (
              <div style={{ padding: '0 10px 24px 10px', fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '-20px' }}>
                {article.imageCaption}
              </div>
            )}

            {/* Monetisasi: In-Article Ad Atas */}
            <AdUnit format="in-article" style={{ marginBottom: '32px' }} />
            
            {/* Ringkasan AI Bedain (TL;DR) */}
            {displayArticle.excerpt && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(to bottom, #a855f7, #3b82f6)'
                }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={18} color="#a855f7" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '0.5px' }}>
                    Ringkasan AI Bedain
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    color: '#a855f7',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>BETA</span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500
                }}>
                  {displayArticle.excerpt}
                </p>
              </div>
            )}
            
            {/* Horizontal Social Share */}
            <div className="sticky-share-bar">
              <span className="share-label" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '8px' }}>Bagikan & Simpan:</span>
              <button onClick={() => handleReaction('like')} title="Suka" style={{ background: reaction === 'like' ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-bg-secondary)', border: `1px solid ${reaction === 'like' ? 'var(--color-accent)' : 'var(--color-border)'}`, color: reaction === 'like' ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 600 }}>
                <ThumbsUp size={16} fill={reaction === 'like' ? 'currentColor' : 'none'} />
                <span>{reactionCounts.like || 0}</span>
              </button>
              <button onClick={toggleBookmark} title={isBookmarked ? "Hapus dari Tersimpan" : "Simpan Artikel / Baca Nanti"} style={{ background: isBookmarked ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-bg-secondary)', border: `1px solid ${isBookmarked ? 'var(--color-accent)' : 'var(--color-border)'}`, color: isBookmarked ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 600 }}>
                <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="share-btn-text">{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
              </button>
              <button onClick={handleShare} disabled={isSharing} title="Bagikan" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 600, opacity: isSharing ? 0.6 : 1 }}>
                <Share2 size={16} />
                <span className="share-btn-text">{isSharing ? 'Menyiapkan...' : 'Share'}</span>
              </button>
              <button onClick={handleCopyLink} title="Salin Tautan" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: copied ? '#4ade80' : 'var(--color-text-primary)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 600 }}>
                {copied ? <Check size={16} /> : <Link2 size={16} />}
                <span className="share-btn-text">Copy</span>
              </button>
              <button onClick={toggleFontSize} title="Ukuran Font" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 600, marginLeft: 'auto' }}>
                <Type size={16} />
                <span>Aa</span>
              </button>
            </div>

            {/* AI Text-to-Speech Podcast Audio Player */}
            <div style={{
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
                  <div style={{
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
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        Dengarkan Berita AI
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
                          LIVE PLAYING
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
                          PAUSED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {isPlayingTTS ? (ttsPaused ? 'Narasi dijeda. Klik Play untuk melanjutkan.' : 'Narator AI sedang membacakan artikel ini untuk Anda...') : 'Dengarkan isi artikel layaknya podcast saat Anda sedang beraktivitas.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
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
                    {isPlayingTTS && !ttsPaused ? 'Jeda Suara' : isPlayingTTS && ttsPaused ? 'Lanjutkan' : 'Putar Suara'}
                  </button>

                  {isPlayingTTS && (
                    <button
                      onClick={handleStopTTS}
                      title="Berhenti"
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Kecepatan:</span>
                  {[0.8, 1.0, 1.25, 1.5].map(rate => (
                    <button
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
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Suara:</span>
                    <select
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

            {/* Excerpt Lead */}
            {(article.seoDescription || article.excerpt) && (
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                lineHeight: 1.7,
                color: 'var(--color-text-primary)',
                fontStyle: 'italic',
                padding: '20px 24px',
                margin: '8px 0 32px 0',
                background: 'var(--color-bg-secondary)',
                borderLeft: '4px solid var(--color-accent)',
                borderRadius: '0 12px 12px 0',
                fontFamily: 'var(--font-heading)',
                overflowWrap: 'break-word'
              }}>
                {(article.seoDescription || article.excerpt).replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ')}
              </div>
            )}

            {/* Rich Content Text */}
            <div
              className="article-content modern-content ql-editor"
              style={{
                fontSize: getFontSizeValue(),
                lineHeight: 1.85,
                color: 'var(--color-text-primary)',
                padding: 0,
                transition: 'font-size 0.3s ease',
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
                
                return (
                  <React.Fragment key={index}>
                    <div className="article-block" dangerouslySetInnerHTML={{ __html: block }} />
                    
                    {/* Inject Baca Juga (Interactive Card) */}
                    {isRelatedInsertPos && relatedArticles.length > 0 && (
                      <div className="inline-related-articles" style={{ margin: '40px 0', padding: '16px 12px', background: 'var(--color-bg-secondary)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)' }}></div>
                          <span style={{ fontSize: '14px', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            BACA JUGA
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {relatedArticles.slice(0, 2).map(rel => (
                            <Link key={rel.id} href={`/article/${rel.slug || rel.id}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', background: 'var(--color-bg-primary)', padding: '12px', borderRadius: '12px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', alignItems: 'center' }} className="no-underline" onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)' }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                <LazyImage src={getArticleCardImage(rel)} alt={rel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <VideoBadge article={rel} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4, textDecoration: 'none' }}>{rel.title}</h4>
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
            <div style={{ margin: '40px 0', width: '100%', display: 'flex', justifyContent: 'center' }} className="rrm-inline-cta-container">
              <div rrm-inline-cta="283941b3-47c7-4436-9b36-25f35b10f598"></div>
            </div>

            {/* Tags Section */}
            {Array.isArray(displayArticle.tags) && displayArticle.tags.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={14} /> TOPIK:
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
                    Add <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-accent)' }}>{settings?.siteName || 'Bedain News'}</span> as a preferred source on Google
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
              </div>
            </div>

            {/* Modern Reaction Widget */}
            {(() => {
              const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0) || 1;
              const reactionItems = [
                { type: 'like', emoji: '👍', label: 'Suka', count: reactionCounts.like || 0, color: '#2563eb' },
                { type: 'insightful', emoji: '💡', label: 'Bermanfaat', count: reactionCounts.insightful || 0, color: '#10b981' },
                { type: 'fire', emoji: '🔥', label: 'Memukau', count: reactionCounts.fire || 0, color: '#f97316' },
                { type: 'love', emoji: '❤️', label: 'Inspiratif', count: reactionCounts.love || 0, color: '#ec4899' },
                { type: 'shock', emoji: '😲', label: 'Mengejutkan', count: reactionCounts.shock || 0, color: '#8b5cf6' },
                { type: 'sad', emoji: '😢', label: 'Sedih', count: reactionCounts.sad || 0, color: '#06b6d4' }
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
                      ✨ RESPONS PEMBACA
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>
                      Bagaimana reaksi Anda terhadap artikel ini?
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {totalReactions} pembaca telah memberikan respons
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
                              {item.count} suara
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
                  <Flame size={20} color="var(--color-accent)" /> Baca Juga
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
                              <span>{rel.category}</span>
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
                            {rel.title}
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
                  Tingkatkan pengalaman membaca Anda tanpa iklan dan akses ke konten eksklusif premium.
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
                  Langganan Sekarang
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
            <CommentSection articleSlug={slug} articleTitle={article?.title} />
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
                  <Sparkles size={14} /> Rekomendasi Redaksi
                </div>
                <h2 className="related-news-title">
                  Berita Terkait & Pilihan Untuk Anda
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
                Lihat Semua Berita →
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
                          {item.category}
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
                        {item.title}
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
                  ⚡ BACA SELANJUTNYA
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                  {nextArt.title}
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
              <span>Lanjut</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        );
      })()}

      {showShareModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }} onClick={() => setShowShareModal(false)}>
          <div style={{ 
            background: 'var(--color-bg-tertiary)', padding: '32px', borderRadius: '24px', 
            width: '90%', maxWidth: '400px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
             <h3 style={{ color: 'var(--color-text-primary)', fontSize: '1.4rem', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>Bagikan Artikel Ini</h3>
             <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{article.title}</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {isClient && isMobileDevice() && (
                    <button 
                      onClick={async () => {
                        setIsSharing(true);
                        const success = await shareArticleWithImage(article);
                        setIsSharing(false);
                        if (success) setShowShareModal(false);
                      }}
                      disabled={isSharing}
                      style={{ background: 'linear-gradient(135deg, var(--color-accent), #ff5252)', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(230,57,70,0.3)' }}
                    >
                      <Share2 size={18} />
                      <span>{isSharing ? 'Menyiapkan Foto...' : 'Bagikan dengan Foto Artikel'}</span>
                    </button>
                  )}
                 <button 
                   onClick={async () => {
                     if (isClient && isMobileDevice() && (Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.canShare && navigator.share))) {
                       setIsSharing(true);
                       const success = await shareArticleWithImage(article);
                       setIsSharing(false);
                       if (success) {
                         setShowShareModal(false);
                         return;
                       }
                     }
                     window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`*${article.title}*\n\n${article.seoDescription || article.excerpt || ''}\n\nBaca selengkapnya di Bedain News:\n${getPublicArticleUrl(article)}`)}`, '_blank', 'noopener,noreferrer');
                   }}
                   style={{ background: '#25D366', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', width: '100%' }}
                 >
                   WhatsApp {isClient && Capacitor.isNativePlatform() ? '(Sertakan Foto)' : ''}
                 </button>
                 <button 
                   onClick={async () => {
                     if (isClient && isMobileDevice() && (Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.canShare && navigator.share))) {
                       setIsSharing(true);
                       const success = await shareArticleWithImage(article);
                       setIsSharing(false);
                       if (success) {
                         setShowShareModal(false);
                         return;
                       }
                     }
                     window.open(`https://t.me/share/url?url=${encodeURIComponent(getPublicArticleUrl(article))}&text=${encodeURIComponent(`${article.title} - Bedain News`)}`, '_blank', 'noopener,noreferrer');
                   }}
                   style={{ background: '#0088cc', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', width: '100%' }}
                 >
                   Telegram {isClient && Capacitor.isNativePlatform() ? '(Sertakan Foto)' : ''}
                 </button>
                 <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(getPublicArticleUrl(article))}`} target="_blank" rel="noopener noreferrer" style={{ background: '#000', border: '1px solid #333', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', display: 'block' }}>X (Twitter)</a>
                 <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPublicArticleUrl(article))}`} target="_blank" rel="noopener noreferrer" style={{ background: '#1877F2', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>Facebook</a>
                 <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPublicArticleUrl(article))}`} target="_blank" rel="noopener noreferrer" style={{ background: '#0A66C2', color: '#fff', padding: '14px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>LinkedIn</a>
                 <button onClick={handleCopyLink} style={{ background: 'var(--color-bg-secondary)', color: copied ? 'var(--color-success)' : 'var(--color-text-primary)', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                   {copied ? 'Tautan Berhasil Disalin!' : 'Salin Tautan'}
                 </button>
                 <button onClick={() => setShowShareModal(false)} style={{ background: 'transparent', color: 'var(--color-text-secondary)', padding: '10px', marginTop: '4px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>Batal</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;

"use client";
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, limit, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getArticleVideoData, getArticleCardImage } from '../lib/videoHelpers';
import { X, Heart, MessageCircle, Share2, Bookmark, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from './BottomNav';

export default function VideoFeedClient() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userReactions, setUserReactions] = useState({});
  const router = useRouter();
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(150) 
        );
        const snap = await getDocs(q);
        const now = new Date();
        const articles = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => {
            const pDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || Date.now());
            return pDate <= now;
          });

        const videosOnly = articles.filter(a => a.status === 'published' && getArticleVideoData(a));
        
        // Load initial local reactions
        const initialReactions = {};
        videosOnly.forEach(a => {
          const stored = localStorage.getItem(`reaction_${a.id}`);
          if (stored) initialReactions[a.id] = stored;
        });
        setUserReactions(initialReactions);
        setVideos(videosOnly);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    const index = Math.round(scrollPosition / windowHeight);
    if (index !== currentIndex && index >= 0 && index < videos.length) {
      setCurrentIndex(index);
    }
  };

  const handleLike = async (articleId, index) => {
    const isLiked = userReactions[articleId] === 'like';
    const newReaction = isLiked ? null : 'like';
    
    // Optimistic UI update
    const newVideos = [...videos];
    const article = { ...newVideos[index] };
    const currentLikes = article.reactions?.like || 0;
    
    if (isLiked) {
      article.reactions = { ...article.reactions, like: Math.max(0, currentLikes - 1) };
    } else {
      article.reactions = { ...article.reactions, like: currentLikes + 1 };
    }
    newVideos[index] = article;
    setVideos(newVideos);
    setUserReactions(prev => ({ ...prev, [articleId]: newReaction }));

    if (newReaction === 'like') localStorage.setItem(`reaction_${articleId}`, 'like');
    else localStorage.removeItem(`reaction_${articleId}`);

    try {
      await updateDoc(doc(db, 'articles', articleId), {
        [`reactions.like`]: increment(isLiked ? -1 : 1)
      });
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  const handleShare = async (article) => {
    const url = `${window.location.origin}/article/${getSlug(article)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: url
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Tautan disalin!');
    }
  };

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div style={{ height: '100dvh', width: '100vw', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <style jsx>{`
          .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ height: '100dvh', width: '100vw', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '20px' }}>Belum ada video saat ini.</h2>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '20px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 600 }}>Kembali ke Beranda</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#000', width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center' }}>
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{ 
          height: '100dvh', 
          width: '100%',
          maxWidth: '1080px',
          background: '#000', 
          overflowY: 'scroll', 
          scrollSnapType: 'y mandatory',
          position: 'relative'
        }}
      >
      {/* Top Bar (Back Button) */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, margin: '0 auto', maxWidth: '1080px', width: '100%', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 40px))', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <button 
          onClick={() => router.push('/')} 
          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Video Pilihan</span>
        <div style={{ width: '44px' }}></div> {/* Spacer */}
      </div>

      {videos.map((article, index) => {
        const videoData = getArticleVideoData(article);
        const isActive = index === currentIndex;
        
        return (
          <div 
            key={article.id} 
            style={{ 
              height: '100dvh', 
              width: '100%', 
              scrollSnapAlign: 'start', 
              position: 'relative',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Video Player */}
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              {videoData && videoData.type === 'youtube' && (
                <iframe
                  src={`https://www.youtube.com/embed/${videoData.id}?autoplay=${isActive ? 1 : 0}&mute=0&loop=1&playlist=${videoData.id}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', pointerEvents: 'auto', objectFit: 'cover' }}
                />
              )}
              {videoData && videoData.type === 'tiktok' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                   {/* TikTok Embed varies, but usually it's best to show a link or image if script doesn't load perfectly in lists */}
                   <img src={getArticleCardImage(article)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                   <a href={videoData.url} target="_blank" style={{ position: 'absolute', zIndex: 10, background: 'var(--color-accent)', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold' }}>Buka di TikTok</a>
                </div>
              )}
              {videoData && videoData.type === 'facebook' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoData.url)}&show_text=false&width=auto`} width="100%" height="100%" style={{ border: 'none', overflow: 'hidden' }} scrolling="no" frameBorder="0" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
                </div>
              )}
            </div>

            {/* Overlay Gradient for Text */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 10 }}></div>

            {/* Floating Info (Bottom Left) */}
            <div style={{ position: 'absolute', bottom: '90px', left: '16px', right: '70px', zIndex: 20, color: '#fff', pointerEvents: 'none' }}>
              <Link href={`/watch/${getSlug(article)}`} style={{ textDecoration: 'none', color: '#fff', pointerEvents: 'auto' }}>
                <span style={{ display: 'inline-block', background: 'var(--color-accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                  {article.category || 'Berita'}
                </span>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.title}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {article.contributorName || article.author?.name || 'Redaksi'}
                </p>
              </Link>
            </div>

            {/* Action Buttons (Bottom Right) */}
            <div style={{ position: 'absolute', bottom: '90px', right: '12px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button 
                  onClick={() => handleLike(article.id, index)}
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: userReactions[article.id] === 'like' ? '#e63946' : '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                >
                  <Heart size={26} fill={userReactions[article.id] === 'like' ? '#e63946' : 'none'} />
                </button>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{article.reactions?.like || 0}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button 
                  onClick={() => router.push(`/watch/${getSlug(article)}`)} 
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MessageCircle size={26} />
                </button>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{article.commentCount || 0}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button 
                  onClick={() => handleShare(article)}
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Share2 size={26} />
                </button>
              </div>

            </div>

          </div>
        );
      })}
      
      <style jsx global>{`
        /* Sembunyikan scrollbar untuk tampilan feed video */
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        body {
          overflow: hidden; /* Prevent body scroll on this page */
        }
      `}</style>
      <BottomNav />
      </div>
    </div>
  );
}
